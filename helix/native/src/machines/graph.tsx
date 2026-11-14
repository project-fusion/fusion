/**
 * A graph on a phone: its picture, which a pinch zooms and a drag moves, the
 * list of its notes, which the search narrows, the legend that shows or hides
 * each group, and what a screen reader hears.
 *
 * **The list is core's, as the web's is**: `entriesOf` puts the selected
 * note first, then the notes it links to and from, then every other note,
 * and each row says how it stands to the selected one. `depth` keeps the
 * selected note's local graph, from `within`, and a hidden group's notes
 * leave the list and the picture, from `withoutGroups`.
 *
 * **A selection is asked first**, as the web's `requestActive` asks:
 * `before-activate`, which a handler can refuse, then `activate`, and the
 * note and the list's count said. A legend press asks `before-graph-filter`
 * the same way, then sends `graph-filter` and says the count.
 *
 * **The picture is the phone's own**, from `graph-picture.ts`, since the web
 * hands its drawing to a renderer: a tap on a note selects it, two fingers
 * zoom it, one finger moves it once zoomed, and the zoom controls zoom it by
 * half again.
 */
import {
  type Adjacency,
  adjacencyOf,
  entriesOf,
  type GraphLink,
  type GraphNode,
  groupsOf,
  nameOf,
  type Relation,
  sortedOf,
  within,
  withoutGroups,
} from '@fusion.dev/helix-core/graph'
import { formatMessage } from '@fusion.dev/helix-core/words'
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import type { LayoutChangeEvent } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import { useZoom } from '../drivers/zoom'
import type { MachineUse } from '../ir.generated'
import type { Behavior, PartBinding, Props } from '../render/behavior'
import type { Entry } from '../render/entry'
import type { Family } from '../style/form'
import { useTheme } from '../theme/theme'
import { kebab, numberIn, wordsIn } from './date-picker-read'
import { drawingOf, noteAt, placesOf } from './graph-picture'
import { groupRows, noteRows, notesDrawing } from './graph-rows'
import { langOf } from './picker-field-kind'
import { boundTo, given, tell } from './props'

/** By how much a zoom control zooms in, and out again: half again, as the web's renderers do. */
const STEP = 1.5

/** The most a reader zooms into the picture. */
const MOST = 8

/** How far past a note's edge a finger still takes it, in points. */
const REACH = 12

type Read = (name: string) => unknown

/** The note held selected, where the page does not hold it. */
const useActive = (asked: unknown, start: string) => {
  const [own, setOwn] = useState<string | undefined>(undefined)
  const seen = useRef(asked)
  if (seen.current !== asked) {
    seen.current = asked
    setOwn(undefined)
  }
  return [own ?? (typeof asked === 'string' ? asked : start), setOwn] as const
}

/** The groups held hidden: the page's `hiddenGroups`, until the legend changes them. */
const useHidden = (asked: unknown) => {
  const given = Array.isArray(asked) ? (asked as readonly string[]) : []
  const [own, setOwn] = useState<readonly string[] | undefined>(undefined)
  const seen = useRef(asked)
  if (seen.current !== asked) {
    seen.current = asked
    setOwn(undefined)
  }
  return [own ?? given, setOwn] as const
}

/**
 * Words for the live region. **The same words twice differ by a space no
 * reader hears**, as the web's do, since words that do not change are not
 * read again.
 */
const useSaid = () => {
  const [said, setSaid] = useState('')
  const say = useCallback(
    (words: string) => setSaid((was) => (words !== '' && words === was ? `${words} ` : words)),
    [],
  )
  return [said, say] as const
}

/** How a row stands to the selected note, in words, as the web's `relationText` says it. */
export const relationWords = (
  relation: Relation | undefined,
  note: string,
  read: Read,
  lang: string,
): string => {
  const words = (name: string) => formatMessage(wordsIn(read(name)), { note }, lang)
  switch (relation) {
    case 'selected':
      return wordsIn(read('selected-label'))
    case 'to':
      return words('linked-from-label')
    case 'from':
      return words('links-to-label')
    case 'both':
      return words('linked-both-label')
    default:
      return ''
  }
}

/** The notes the list and the picture hold: every note less a hidden group's, and the local graph's where `depth` keeps one. */
const keptOf = (
  nodes: readonly GraphNode[],
  adjacency: Adjacency,
  active: string,
  depth: number | undefined,
  hidden: readonly string[],
) => {
  const held = active !== '' && nodes.some((node) => node.id === active)
  const local =
    typeof depth === 'number' && held ? within(adjacency, active, Math.max(0, depth)) : undefined
  return { kept: withoutGroups(nodes, local, hidden), local }
}

/** The controls a reader asked for, or the graph's resting ones: zoom, and fullscreen on the web. */
const controlsOf = (read: Read) => {
  const asked = wordsIn(read('controls')) || 'zoom fullscreen'
  const words = asked.split(/\s+/)
  return { pans: words.includes('pan'), zooms: words.includes('zoom') }
}

/** A press binding: what the press does. */
const pressed = (go: () => void): PartBinding => ({ view: { onPress: go } })

/** Hosts a phone's graph. */
export const useGraph = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read: Read = (name) => given(family, props, kebab(name))
  const lang = langOf(read)
  const theme = useTheme()
  const nodes = useMemo(
    () => (Array.isArray(props.nodes) ? (props.nodes as readonly GraphNode[]) : []),
    [props.nodes],
  )
  const links = useMemo(
    () => (Array.isArray(props.links) ? (props.links as readonly GraphLink[]) : []),
    [props.links],
  )
  const [active, setActive] = useActive(props.active, wordsIn(read('default-active')))
  const [hidden, setHidden] = useHidden(props.hiddenGroups)
  const [query, setQuery] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [said, say] = useSaid()
  const [box, setBox] = useState({ height: 0, width: 0 })
  const adjacency = useMemo(() => adjacencyOf(links), [links])
  const sorted = useMemo(() => sortedOf(nodes, lang), [lang, nodes])
  const groups = useMemo(() => groupsOf(nodes), [nodes])
  const depth = numberIn(read('depth'))
  const { kept, local } = useMemo(
    () => keptOf(nodes, adjacency, active, depth, hidden),
    [active, adjacency, depth, hidden, nodes],
  )
  const entries = useMemo(
    () => entriesOf(sorted, adjacency, active, query, kept),
    [active, adjacency, kept, query, sorted],
  )
  const count = formatMessage(wordsIn(read('count-label')), { count: entries.length }, lang)
  const chosen = nodes.find((node) => node.id === active)
  const note = chosen ? nameOf(chosen) : ''
  const shownNodes = useMemo(
    () => (kept === undefined ? nodes : nodes.filter((node) => kept.has(node.id))),
    [kept, nodes],
  )
  const shownLinks = useMemo(
    () =>
      kept === undefined
        ? links
        : links.filter((link) => kept.has(link.source) && kept.has(link.target)),
    [kept, links],
  )
  const places = useMemo(() => placesOf(nodes, links), [links, nodes])
  const groupNames = useMemo(() => groups.map((group) => group.name), [groups])
  const drawing = useMemo(
    () =>
      drawingOf(
        { active, groups: groupNames, links: shownLinks, nodes: shownNodes, places },
        box,
        theme,
      ),
    [active, box, groupNames, places, shownLinks, shownNodes, theme],
  )
  const latest = useRef({ entries, hidden, props })
  latest.current = { entries, hidden, props }
  const countOf = (list: number) =>
    formatMessage(wordsIn(read('count-label')), { count: list }, lang)

  /** Asks for a note to be selected, and says it once it stands. */
  const choose = (id: string) => {
    if (id === active) {
      return
    }
    const before = boundTo(use, 'onBeforeActivate', 'event')
    if (before !== undefined && !tell(family, latest.current.props, before, { value: id })) {
      return
    }
    setActive(id)
    const after = boundTo(use, 'onActivate', 'event')
    if (after !== undefined) {
      tell(family, latest.current.props, after, { value: id })
    }
    const next = nodes.find((node) => node.id === id)
    if (next !== undefined) {
      const { kept: nextKept } = keptOf(nodes, adjacency, id, depth, hidden)
      const rows = entriesOf(sorted, adjacency, id, query, nextKept).length
      say(
        formatMessage(
          wordsIn(read('selection-label')),
          { count: countOf(rows), note: nameOf(next) },
          lang,
        ),
      )
    }
  }

  /** Shows a group's notes or hides them, through the request a page can refuse. */
  const toggleGroup = (name: string) => {
    const was = latest.current.hidden
    const next = was.includes(name) ? was.filter((group) => group !== name) : [...was, name]
    const before = boundTo(use, 'onBeforeGraphFilter', 'event')
    if (before !== undefined && !tell(family, latest.current.props, before, { hidden: next })) {
      return
    }
    setHidden(next)
    const after = boundTo(use, 'onGraphFilter', 'event')
    if (after !== undefined) {
      tell(family, latest.current.props, after, { hidden: next })
    }
    const { kept: nextKept } = keptOf(nodes, adjacency, active, depth, next)
    say(countOf(entriesOf(sorted, adjacency, active, query, nextKept).length))
  }

  const search = (words: string) => {
    setQuery(words)
    say(countOf(entriesOf(sorted, adjacency, active, words, kept).length))
  }

  const zoom = useZoom({
    enabled: nodes.length > 0,
    max: MOST,
    tapped: (at) => {
      const { pan, scale } = zoom.zoom()
      const point = {
        x: (at.x - pan.x) / scale + box.width / 2,
        y: (at.y - pan.y) / scale + box.height / 2,
      }
      const id = noteAt(drawing.picture, point, REACH / scale)
      if (id !== undefined) {
        choose(id)
      }
    },
  })
  const measure = (event: LayoutChangeEvent) => {
    zoom.measure(event)
    const { height, width } = event.nativeEvent.layout
    setBox((was) => (was.width === width && was.height === height ? was : { height, width }))
  }
  const panStep = (numberIn(read('pan-step')) ?? 0.25) * Math.min(box.width, box.height)
  const panTo = (x: number, y: number) => zoom.panBy({ x: x * panStep, y: y * panStep })

  const noPanel = read('no-panel') === true
  const controls = controlsOf(read)
  const flag = (one: string) => boundTo(use, one, 'state') ?? kebab(one)
  const named =
    wordsIn(read('aria-label')) || wordsIn(read('label')) || wordsIn(read('fallback-label'))
  const rows = noteRows(entries, (relation) => relationWords(relation, note, read, lang))
  const states: Record<string, boolean | string> = {
    count,
    drawn: drawing.picture !== undefined,
    legended: read('legend') === true && groups.length >= 2,
    named,
    panelHidden: noPanel && !panelOpen,
    pans: controls.pans,
    said,
    toggles: noPanel,
    viewBox: drawing.viewBox,
    zooms: controls.zooms,
  }
  const lists = {
    groups: groupRows(groups, hidden, theme),
    lines: drawing.lines,
    marks: drawing.marks,
    names: drawing.names,
    regions: drawing.regions,
  }
  return {
    marks: [
      ...(entries.length === 0 ? ['empty'] : []),
      ...(read('loading') === true ? ['loading'] : []),
      ...(local === undefined ? [] : ['local']),
      ...(noPanel && panelOpen ? ['panel-open'] : []),
      ...(query.trim() === '' ? [] : ['searching']),
      ...(active === '' ? [] : ['selected']),
    ],
    parts: {
      'drawing-box': { animated: true, view: { style: zoom.style } },
      host: {
        lists: Object.fromEntries(Object.entries(lists).map(([name, list]) => [flag(name), list])),
        states: Object.fromEntries(
          Object.entries(states).map(([name, value]) => [flag(name), value]),
        ),
      },
      'legend-item': {
        copy: (item: Entry) => ({ onPress: () => toggleGroup(String(item.fields.key)) }),
      },
      note: {
        copy: (item: Entry) => ({ onPress: () => choose(String(item.fields.key)) }),
      },
      notes: { windowed: notesDrawing(rows) },
      'notes-toggle': pressed(() => setPanelOpen((was) => !was)),
      'pan-down': pressed(() => panTo(0, -1)),
      'pan-end': pressed(() => panTo(-1, 0)),
      'pan-start': pressed(() => panTo(1, 0)),
      'pan-up': pressed(() => panTo(0, 1)),
      'search-field': { view: { onChangeText: search, value: query } },
      viewport: {
        view: { onLayout: measure },
        wrap: (view: ReactNode) => <GestureDetector gesture={zoom.gesture}>{view}</GestureDetector>,
      },
      'zoom-in': pressed(() => zoom.zoomTo(zoom.zoom().scale * STEP)),
      'zoom-out': pressed(() => zoom.zoomTo(zoom.zoom().scale / STEP)),
    },
  }
}
