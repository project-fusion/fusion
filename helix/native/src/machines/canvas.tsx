/**
 * A board of cards on a phone, read-only: its cards placed on a plane that
 * a pinch zooms and a finger moves, its connections drawn from core's
 * `connector`, the ruling, the minimap, the zoom controls, and what a screen
 * reader hears of each card and each connection.
 *
 * **The cards are the page's children**, each a Canvas Node, drawn by its
 * own element in the place this one hands it through `CanvasBoard`, in the
 * order a screen reader walks them: each card in core's reading order, then
 * a view of its own over the middle of each connection leaving it, since a
 * line in a vector is no element a screen reader can reach.
 *
 * **A selection is asked first**, as the web's `choose` asks:
 * `before-select`, which a handler can refuse, then `select`, with the
 * names comma separated. A tap selects the card or the connection under it,
 * or nothing on the empty board, and a screen reader's activation does the
 * same.
 */
import { planeOf } from '@fusion.dev/helix-core/canvas'
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import { GestureDetector } from 'react-native-gesture-handler'
import type { MachineUse } from '../ir.generated'
import type { Behavior, DrawingLook, PartBinding, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { useTheme } from '../theme/theme'
import { type Board, CanvasBoard, edgeViewsOf, linkWords, useMinimap } from './canvas-a11y'
import { cardsOf, type Line, type Link, linesOf, linksOf, type Stop, walkOf } from './canvas-board'
import { type Motion, useBoardMotion } from './canvas-motion'
import { onScreenOf, Ruling } from './canvas-view'
import { kebab, numberIn, wordsIn } from './date-picker-read'
import { langOf } from './picker-field-kind'
import { boundTo, given, tell } from './props'

export { useCanvasNode } from './canvas-a11y'

type Read = (name: string) => unknown

/** The selection held, where the page does not hold it: the page's `selected`, until a press changes it. */
const useSelected = (asked: unknown) => {
  const [own, setOwn] = useState<string | undefined>(undefined)
  const seen = useRef(asked)
  if (seen.current !== asked) {
    seen.current = asked
    setOwn(undefined)
  }
  return [own ?? wordsIn(asked), setOwn] as const
}

/** Words for the live region, the same words twice told apart by a space no reader hears. */
const useSaid = () => {
  const [said, setSaid] = useState('')
  const say = useCallback(
    (words: string) => setSaid((was) => (words !== '' && words === was ? `${words} ` : words)),
    [],
  )
  return [said, say] as const
}

/** The controls a reader asked for, or the board's resting ones: zoom, and fullscreen on the web. */
const controlsOf = (read: Read) => {
  const words = (wordsIn(read('controls')) || 'zoom fullscreen').split(/\s+/)
  return {
    minimap: words.includes('minimap'),
    pans: words.includes('pan'),
    zooms: words.includes('zoom'),
  }
}

/** Where the controls stand, and how many rows and columns of them a fit keeps clear of. */
const clusterOf = (read: Read, controls: ReturnType<typeof controlsOf>) => ({
  columns: controls.pans ? 4 : 1,
  placement: wordsIn(read('controls-placement')) || 'top-end',
  rows: controls.pans ? 3 : Number(controls.zooms) * 2,
})

/** A press binding: what the press does. */
const pressed = (go: () => void): PartBinding => ({ view: { onPress: go } })

/** A length a token gives in points, `1px` as 1. */
const pointsOf = (value: unknown, fallback: number): number => {
  const number = Number.parseFloat(String(value ?? ''))
  return Number.isFinite(number) ? number : fallback
}

/** The selection's keys, a connection's name read as its key, as the web's `keyNamed` reads it. */
const pickedOf = (selected: string, walk: readonly Stop[]): ReadonlySet<string> => {
  const keys = new Set(walk.map((stop) => stop.key))
  const keyOf = (one: string) => {
    if (keys.has(one)) {
      return one
    }
    return keys.has(`edge:${one}`) ? `edge:${one}` : ''
  }
  return new Set(
    selected
      .split(',')
      .map((one) => keyOf(one.trim()))
      .filter((one) => one !== ''),
  )
}

/** What a board reads of its children and its props: its cards, their connections, the plane, and the walk. */
const useModel = (props: Props, read: Read, selected: string) => {
  const cards = useMemo(() => cardsOf(props.children), [props.children])
  const links = useMemo(() => linksOf(props.children), [props.children])
  const nodes = useMemo(() => cards.map((card) => card.node), [cards])
  const plane = useMemo(() => planeOf(nodes), [nodes])
  const order = read('order') === 'edges' ? 'edges' : 'spatial'
  const walk = useMemo(() => walkOf(nodes, links, order), [links, nodes, order])
  const picked = useMemo(() => pickedOf(selected, walk), [selected, walk])
  const asked = read('path')
  const path = asked === 'step' || asked === 'straight' ? asked : 'curve'
  const lines = useMemo(
    () => linesOf(links, nodes, plane.origin, path, picked),
    [links, nodes, path, picked, plane.origin],
  )
  return { cards, lines, links, nodes, picked, plane, walk }
}

/** Each connection's label, at its line's middle. */
const labelsOf = (lines: readonly Line[], links: readonly Link[]) =>
  lines.flatMap((line) => {
    const text = links.find((one) => one.key === line.key)?.edge.label
    return text ? [{ key: line.key, text, x: line.mid.x, y: line.mid.y }] : []
  })

/** The board's ruling, drawn once the box is measured, in the color the grid's rule gives it. */
const rulingOf =
  (motion: Motion, plane: ReturnType<typeof planeOf>, dots: boolean, thin: number) =>
  (look: DrawingLook): ReactNode =>
    motion.box.width === 0 ? null : (
      <Ruling
        box={motion.box}
        color={String(look.text.color ?? 'transparent')}
        dots={dots}
        plane={plane}
        scale={motion.zoom.scale}
        settled={motion.settled}
        size={32}
        thin={thin}
        x={motion.zoom.x}
        y={motion.zoom.y}
      />
    )

/** The parts that move the board: the plane, the viewport's gestures, the controls. */
const movingParts = (motion: Motion, plane: ReturnType<typeof planeOf>) => ({
  board: {
    animated: true,
    view: {
      style: [
        {
          left: (motion.box.width - plane.box.width) / 2,
          top: (motion.box.height - plane.box.height) / 2,
        },
        motion.zoom.style,
      ],
    },
  },
  'pan-down': pressed(() => motion.panWay('down')),
  'pan-end': pressed(() => motion.panWay('end')),
  'pan-start': pressed(() => motion.panWay('start')),
  'pan-up': pressed(() => motion.panWay('up')),
  viewport: {
    view: { onLayout: motion.measure },
    wrap: (view: ReactNode) => (
      <GestureDetector gesture={motion.zoom.gesture}>{view}</GestureDetector>
    ),
  },
  'zoom-in': pressed(() => motion.zoomBy(1)),
  'zoom-out': pressed(() => motion.zoomBy(-1)),
})

/** Hosts a phone's board. */
export const useCanvas = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read: Read = (name) => given(family, props, kebab(name))
  const lang = langOf(read)
  const theme = useTheme()
  const [selected, setSelected] = useSelected(props.selected)
  const [said, say] = useSaid()
  const model = useModel(props, read, selected)
  const { cards, lines, links, nodes, picked, plane, walk } = model
  const latest = useRef({ props, selected })
  latest.current = { props, selected }
  const controls = controlsOf(read)
  const told = (name: string, detail: Readonly<Record<string, unknown>>) => {
    const event = boundTo(use, name, 'event')
    return event === undefined || tell(family, latest.current.props, event, detail)
  }
  /* Asked first, as the web's `choose` asks. */
  const choose = (chosen: readonly string[]) => {
    const value = chosen.map((key) => key.replace(/^edge:/, '')).join(',')
    if (value !== latest.current.selected && told('onBeforeSelect', { value })) {
      setSelected(value)
      told('onSelect', { value })
    }
  }
  const motion = useBoardMotion({
    cluster: clusterOf(read, controls),
    lang,
    lines,
    nodes,
    panStep: numberIn(read('pan-step')) ?? 0.25,
    plane,
    read,
    say,
    select: choose,
    tell: told,
  })
  const screen = onScreenOf(motion.box, plane, motion.settled)
  const minimap = useMinimap(nodes, screen, controls.minimap && nodes.length > 0, motion.bring)
  const flag = (one: string) => boundTo(use, one, 'state') ?? kebab(one)
  const grid = read('grid')
  const board: Board = {
    choose: (key) => choose([key]),
    linked: linkWords(nodes, links, read, lang),
    origin: plane.origin,
    picked,
    selectedLabel: wordsIn(read('selected-label')),
    toneLabels: (read('tone-labels') ?? {}) as Readonly<Record<string, string>>,
  }
  const edgeViews = edgeViewsOf(walk, lines, nodes, board, read, lang)
  const byName = new Map(cards.map((card) => [card.node.id, card.element]))
  const ordered = walk.map((stop) =>
    stop.kind === 'edge' ? (edgeViews.get(stop.key) ?? null) : (byName.get(stop.key) ?? null),
  )
  const states: Record<string, boolean | string> = {
    drafting: false,
    minimapped: minimap.shown,
    minimapView: minimap.viewBox,
    named: wordsIn(read('aria-label')) || wordsIn(read('label')) || wordsIn(read('fallback-label')),
    pans: controls.pans,
    ruled: grid === 'lines' || grid === 'dots',
    said,
    viewBox: `0 0 ${plane.box.width} ${plane.box.height}`,
    zooms: controls.zooms,
  }
  const lists = {
    labels: labelsOf(lines, links),
    lines,
    minimapFrame: minimap.frame,
    minimapNodes: minimap.nodes,
  }
  return {
    marks: [
      ...(nodes.length === 0 ? ['empty'] : []),
      ...(read('loading') === true ? ['loading'] : []),
    ],
    measured: {
      '_canvas-plane-block-size': plane.box.height,
      '_canvas-plane-inline-size': plane.box.width,
    },
    parts: {
      ...movingParts(motion, plane),
      host: {
        lists: Object.fromEntries(Object.entries(lists).map(([name, list]) => [flag(name), list])),
        states: Object.fromEntries(
          Object.entries(states).map(([name, value]) => [flag(name), value]),
        ),
      },
      minimap: { view: minimap.view },
      ruling: {
        drawing: rulingOf(motion, plane, grid === 'dots', pointsOf(theme.tokens['border-thin'], 1)),
      },
    },
    provide: (drawn) => <CanvasBoard.Provider value={board}>{drawn}</CanvasBoard.Provider>,
    regions: { default: ordered },
  }
}
