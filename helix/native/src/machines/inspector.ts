/**
 * The machine an object inspector runs: the rows of its value, what a press
 * and a key do to them, and what a screen reader hears of each.
 *
 * **It reads core's arithmetic**, the same the web element reads, so a filter,
 * a new value, and a key leave the same rows on both platforms. A repeat marked
 * `windowed` draws the rows, in `FlatList` under `windowed` and in the tree
 * otherwise.
 */
import { announce } from '@fusion.dev/helix-core/capabilities/announce'
import { clipboard } from '@fusion.dev/helix-core/capabilities/clipboard'
import { environment } from '@fusion.dev/helix-core/capabilities/environment'
import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import type { KeyPress, Stop } from '@fusion.dev/helix-core/capabilities/types'
import {
  entries,
  pageRows,
  type Row,
  siblingBranches,
  Typeahead,
  treeArrow,
} from '@fusion.dev/helix-core/object-inspector'
import { formatMessage, lookupWord } from '@fusion.dev/helix-core/words'
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, PartBinding, Props } from '../render/behavior'
import type { Family } from '../style/form'
import type { Entered } from './entry'
import {
  emptyModel,
  type InspectorGiven,
  type InspectorModel,
  openedModel,
  settleModel,
} from './inspector-model'
import { boundTo, given, tell, told } from './props'
import { useRowViews, type WindowScroller } from './window'

/** How tall a row is taken to be before a key pages or the list reveals one, as the web's estimate is. */
const ESTIMATE = 24

/** The kind of value an entry holds, as the web element's `ObjectInspectorEntry` names it. */
const kindOf = (value: unknown): string => {
  if (value === null) {
    return 'null'
  }
  if (Array.isArray(value)) {
    return 'array'
  }
  const type = typeof value
  return type === 'boolean' || type === 'number' || type === 'object' || type === 'string'
    ? type
    : 'other'
}

/** What copying a row takes: a branch as indented JSON, a string as itself. */
const copyable = (row: Row | undefined): string => {
  if (row === undefined) {
    return ''
  }
  return typeof row.value === 'string'
    ? row.value
    : (JSON.stringify(row.value, null, 2) ?? String(row.value))
}

/** The words a phone says of a row's level and its place. */
const placeWords = (row: Row): string => {
  const tag = locale().read()
  const found = lookupWord(tag, 'helix-tree', 'treeItemPlace')
  const words = typeof found?.[0] === 'string' ? found[0] : 'Level {level}, {position} of {size}'
  return formatMessage(
    words,
    { level: row.depth + 1, position: row.position, size: row.siblings },
    tag,
  )
}

/** The words of a value as a row draws it. */
const wordsOf = (row: Row): string => {
  const { value } = row
  if (row.branch) {
    return Array.isArray(value) ? '[…]' : '{…}'
  }
  return typeof value === 'string' ? JSON.stringify(value) : String(value)
}

/** The sentences written so far, since ten thousand rows of one count say one sentence. */
const SENTENCES = new Map<string, string>()

/** A count in its plural message. */
const counted = (message: unknown, count: number): string => {
  const tag = locale().read()
  const asked = `${tag}|${count}|${String(message ?? '')}`
  const known = SENTENCES.get(asked)
  if (known !== undefined) {
    return known
  }
  const said = formatMessage(String(message ?? ''), { count }, tag)
  SENTENCES.set(asked, said)
  return said
}

/** Which kinds of value a row does not draw, for its copies to hide. */
const kindsOf = (row: Row, drawn: boolean) => {
  const { branch, value } = row
  const scalar = typeof value === 'boolean' || typeof value === 'number'
  const other = (kind: boolean): boolean => drawn || !kind
  return {
    notBoolean: other(typeof value === 'boolean'),
    notBranch: other(branch),
    notNull: other(value === null),
    notNumber: other(typeof value === 'number'),
    notString: other(!branch && value !== null && !scalar),
  }
}

/** The words of each kind, which only the kind a row draws holds. */
const wordsOfKinds = (row: Row, kinds: ReturnType<typeof kindsOf>) => {
  const words = wordsOf(row)
  const unless = (hidden: boolean): string => (hidden ? '' : words)
  return {
    booleanWords: unless(kinds.notBoolean),
    nullWords: unless(kinds.notNull),
    numberWords: unless(kinds.notNumber),
    stringWords: unless(kinds.notString),
    summaryWords: unless(kinds.notBranch),
  }
}

/** The words of a branch's count, or none. */
const countOf = (row: Row, words: Counts): string => {
  if (!row.branch) {
    return ''
  }
  const message = Array.isArray(row.value) ? words.items : words.keys
  return counted(message, entries(row.value as object).length)
}

/** The messages a branch counts its entries in. */
interface Counts {
  readonly items: unknown
  readonly keys: unknown
}

/** Whether `renderValue` draws a row's value. */
const drawnBy = (render: unknown, row: Row, about: Readonly<Record<string, unknown>>): boolean =>
  typeof render === 'function' &&
  (render as (...given: unknown[]) => unknown)(row.value, about) !== undefined

/** What one row of the repeat reads, by the fields its copy names. */
const rowFields = (row: Row, at: number, lit: boolean, words: Counts, render: unknown) => {
  const about = { depth: row.depth, key: row.key, path: row.path, type: kindOf(row.value) }
  const drawn = drawnBy(render, row, about)
  const kinds = kindsOf(row, drawn)
  return {
    ...kinds,
    ...wordsOfKinds(row, kinds),
    about,
    active: lit,
    at,
    branch: row.branch,
    caret: row.open ? 'caret-down' : 'caret-end',
    colon: row.key === undefined ? '' : ': ',
    counted: countOf(row, words),
    depth: String(row.depth),
    drawn,
    header: false,
    key: `row-${row.path}`,
    keyed: row.key !== undefined,
    leaf: !row.branch,
    match: row.match,
    name: row.key ?? '',
    row,
    unkeyed: row.key === undefined,
    value: row.value,
  }
}

/** Whether a key types a letter of a search. */
const typed = (pressed: KeyPress): boolean =>
  [...pressed.key].length === 1 && !(pressed.control || pressed.meta || pressed.alt)

/** Whether the page reads right to left. */
const isRtl = (): boolean => environment().read().direction === 'rtl'

/** What the machine asks of the rows, for a key to run. */
interface Acts {
  readonly copy: () => void
  readonly move: (to: number) => void
  readonly open: (paths: readonly string[], open: boolean) => void
}

/** What a key that goes along the line does on a row. */
const along = (key: string, row: Row, model: InspectorModel, acts: Acts): void => {
  const inward = (key === 'ArrowRight') !== isRtl()
  const arrow = treeArrow(
    { branch: row.branch, depth: row.depth, open: row.open } as Parameters<typeof treeArrow>[0],
    inward ? 1 : -1,
  )
  if (arrow === 'open' || arrow === 'close') {
    acts.open([row.path], !row.open)
  } else if (arrow === 'child') {
    acts.move(model.cursor + 1)
  } else if (arrow === 'parent') {
    const parent = model.rows.findLastIndex(
      (one, at) => at < model.cursor && one.depth === row.depth - 1,
    )
    if (parent >= 0) {
      acts.move(parent)
    }
  }
}

/** Where a key that moves between rows lands, or nothing for another key. */
const stepped = (key: string, model: InspectorModel, page: number): number | undefined =>
  ({
    ArrowDown: model.cursor + 1,
    ArrowUp: model.cursor - 1,
    End: model.rows.length - 1,
    Home: 0,
    PageDown: model.cursor + page,
    PageUp: model.cursor - page,
  })[key]

/** Moves to the next row whose key starts with what was typed. */
const typeTo = (key: string, model: InspectorModel, acts: Acts, typeahead: Typeahead): void => {
  const keysOfRows = model.rows.map((one) => one.key ?? '')
  const found = typeahead.match(key, keysOfRows, model.cursor)
  if (found >= 0) {
    acts.move(found)
  }
}

/** What a key that is no step does on a row, or `false` for one the tree leaves. */
const onRow = (
  pressed: KeyPress,
  row: Row,
  model: InspectorModel,
  acts: Acts,
  typeahead: Typeahead,
): boolean => {
  const { key } = pressed
  if (key === 'ArrowRight' || key === 'ArrowLeft') {
    along(key, row, model, acts)
  } else if (key === 'Enter' || key === ' ') {
    if (row.branch) {
      acts.open([row.path], !row.open)
    }
  } else if (key === '*') {
    acts.open(siblingBranches(model.rows, row), true)
  } else if (typed(pressed)) {
    typeTo(key, model, acts, typeahead)
  } else {
    return false
  }
  return true
}

/** What a key on the active row does, or `false` for one the tree leaves. */
const keyed = (
  pressed: KeyPress,
  model: InspectorModel,
  page: number,
  acts: Acts,
  typeahead: Typeahead,
): boolean => {
  const row = model.rows[model.cursor]
  if (row === undefined || pressed.claimed) {
    return false
  }
  if ((pressed.control || pressed.meta) && pressed.key.toLowerCase() === 'c') {
    acts.copy()
    return true
  }
  const to = stepped(pressed.key, model, page)
  if (to === undefined) {
    return onRow(pressed, row, model, acts, typeahead)
  }
  acts.move(to)
  return true
}

/** The events the machine sends, by what each says. */
const eventsOf = (use: MachineUse) => ({
  activate: boundTo(use, 'onActivate', 'event'),
  before: boundTo(use, 'onBeforeActivate', 'event'),
  beforeClose: boundTo(use, 'onBeforeClose', 'event'),
  beforeOpen: boundTo(use, 'onBeforeOpen', 'event'),
  copy: boundTo(use, 'onCopy', 'event'),
  toggle: boundTo(use, 'onToggle', 'event'),
})

/** Says how many entries a filter matched as it changes, and nothing for an empty one. */
const useTell = (found: Set<string> | undefined, message: unknown): void => {
  const first = useRef(true)
  // biome-ignore lint/correctness/useExhaustiveDependencies: the words follow the matches alone
  useEffect(() => {
    if (first.current) {
      first.current = false
    } else if (found !== undefined) {
      announce().say(counted(message, found.size), 'polite')
    }
  }, [found])
}

/** Down from the filter field goes to the active row, where the matches are. */
const useFieldKeys = (toRow: () => boolean) => {
  const stop = useRef<Stop | undefined>(undefined)
  const heard = useRef(toRow)
  heard.current = toRow
  return useCallback((node: unknown) => {
    stop.current?.()
    stop.current =
      node === null || node === undefined
        ? undefined
        : keys().listen(node, (pressed) => pressed.key === 'ArrowDown' && heard.current())
  }, [])
}

/** What the acts of a reader read and write. */
interface Holding {
  readonly events: ReturnType<typeof eventsOf>
  readonly family: Family
  readonly held: RefObject<InspectorModel>
  readonly land: (at: number) => void
  readonly latest: RefObject<Props>
  readonly redraw: () => void
}

/** Puts the active row on the clipboard, and says so once it is there. */
const copyRow = ({ events, family, held, latest }: Holding): void => {
  const text = copyable(held.current.rows[held.current.cursor])
  void clipboard()
    .write(text)
    .then((wrote) => {
      if (wrote && events.copy) {
        told(family, latest.current, events.copy, { value: text })
      }
    })
}

/** Moves the active row, asking first, and gives it focus. */
const moveRow = ({ events, family, held, land, latest, redraw }: Holding, to: number): void => {
  const now = held.current
  const at = Math.max(0, Math.min(to, now.rows.length - 1))
  const path = now.rows[at]?.path
  if (path === undefined) {
    return
  }
  if (at !== now.cursor) {
    if (events.before && !tell(family, latest.current, events.before, { value: path })) {
      return
    }
    held.current = { ...now, cursor: at }
    if (events.activate) {
      told(family, latest.current, events.activate, { value: path })
    }
    redraw()
  }
  land(at)
}

/** Opens or closes branches, asking first, and says so. */
const openRows = (
  { events, family, held, latest, redraw }: Holding,
  paths: readonly string[],
  open: boolean,
): void => {
  const before = open ? events.beforeOpen : events.beforeClose
  if (paths.length === 0 || (before && !tell(family, latest.current, before, { open }))) {
    return
  }
  held.current = openedModel(held.current, paths, open)
  if (events.toggle) {
    told(family, latest.current, events.toggle, {
      newState: open ? 'open' : 'closed',
      oldState: open ? 'closed' : 'open',
    })
  }
  redraw()
}

/** What each row's view takes from the machine. */
const rowBinding = (
  held: RefObject<InspectorModel>,
  acts: Acts,
  touch: () => void,
  rowRef: (at: number) => (node: unknown) => void,
): PartBinding => ({
  copy: (entry) => {
    const { at, row } = entry.fields as unknown as ReturnType<typeof rowFields>
    return {
      accessibilityState: row.branch ? { expanded: row.open } : {},
      accessibilityValue: { text: placeWords(row) },
      focusable: at === held.current.cursor,
      onFocus: () => {
        touch()
        if (at !== held.current.cursor) {
          acts.move(at)
        }
      },
      onPress: () => {
        touch()
        acts.move(at)
        if (row.branch && held.current.rows[held.current.cursor]?.path === row.path) {
          acts.open([row.path], !row.open)
        }
      },
      ref: rowRef(at),
    }
  },
})

/** The states a row's surroundings read, by the names the form binds. */
const computedOf = (
  read: (name: string) => unknown,
  use: MachineUse,
  model: InspectorModel,
  copyText: string,
): Readonly<Record<string, boolean | string>> => {
  const current = model.rows[model.cursor]
  const label = String(read('label') ?? '')
  const copyName =
    current?.key === undefined
      ? read('copyValueLabel')
      : formatMessage(String(read('copyLabel') ?? ''), { name: current.key }, locale().read())
  const named = (name: string, value: boolean | string) => {
    const bound = boundTo(use, name, 'state')
    return bound === undefined ? {} : { [bound]: value }
  }
  return {
    ...named('blank', model.rows.length === 0),
    ...named('copyName', String(copyName ?? '')),
    ...named('copyText', copyText),
    ...named('named', label || String(read('treeLabel') ?? '')),
    ...named('said', String(read(model.found ? 'noMatchesLabel' : 'emptyText') ?? '')),
    ...named('topped', label !== '' || read('filterable') === true),
    activePath: current?.path ?? '',
    matchedRows: model.rows.flatMap((one, at) => (one.match ? [at] : [])).join(','),
  }
}

/** The custom states the element is in. */
const marksOf = (model: InspectorModel): readonly string[] => [
  ...(model.rows.length === 0 ? ['empty'] : []),
  ...(model.found === undefined ? [] : ['filtered']),
  ...((model.found?.size ?? 0) > 0 ? ['matched'] : []),
]

/** What the props give the model. */
const givenOf = (read: (name: string) => unknown, entered: Entered | undefined): InspectorGiven => {
  const expanded = read('expanded')
  const active = read('active')
  return {
    active: typeof active === 'string' ? active : undefined,
    depth: Number(read('defaultDepth') ?? 1),
    expanded: Array.isArray(expanded) ? (expanded as string[]) : undefined,
    filter: entered?.value ?? '',
    root: read('value'),
  }
}

/** The list a windowed repeat draws, and how it brings a row into view. */
const useList = (windowed: boolean) => {
  const list = useRef<WindowScroller | null>(null)
  const standing = useRef({ frame: 0, offset: 0 })
  const reveal = (at: number): void => {
    const { frame, offset } = standing.current
    const top = at * ESTIMATE
    if (windowed && (top < offset || top + ESTIMATE > offset + frame)) {
      list.current?.scrollToIndex?.({ animated: false, index: at })
    }
  }
  return { list, reveal, standing }
}

/**
 * Hosts the inspector: its value's rows, opened and filtered as the props and
 * the field say, with what a press and a key do.
 */
export const useInspector = (
  family: Family,
  props: Props,
  use: MachineUse,
  entered: Entered | undefined,
): Behavior => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const held = useRef<InspectorModel>(emptyModel())
  const [, bump] = useState(0)
  const [touched, setTouched] = useState(false)
  const model = settleModel(held.current, givenOf(read, entered))
  held.current = model
  useTell(model.found, read('resultsLabel'))
  const latest = useRef(props)
  latest.current = props
  const windowed = read('windowed') === true
  const { list, reveal, standing } = useList(windowed)
  const typeahead = useRef(new Typeahead()).current
  const onKey = useRef<(pressed: KeyPress) => boolean>(() => false)
  const { moveTo, rowRef, views } = useRowViews((_at, pressed) => onKey.current(pressed))
  const touch = () => setTouched(true)

  /** Brings the row at `at` into the window where it is not, and gives it focus. */
  const land = (at: number): void => {
    reveal(at)
    const view = views.get(at)
    if (view === undefined) {
      moveTo.current = at
    } else {
      focus().focus(view, false)
    }
  }

  const holding: Holding = {
    events: eventsOf(use),
    family,
    held,
    land,
    latest,
    redraw: () => bump((one) => one + 1),
  }
  const acts: Acts = {
    copy: () => copyRow(holding),
    move: (to) => moveRow(holding, to),
    open: (paths, open) => openRows(holding, paths, open),
  }
  onKey.current = (pressed) => {
    touch()
    const page = pageRows(standing.current.frame, ESTIMATE)
    return keyed(pressed, held.current, page, acts, typeahead)
  }

  const fieldRef = useFieldKeys(() => {
    if (held.current.rows.length === 0) {
      return false
    }
    touch()
    land(held.current.cursor)
    return true
  })

  const items = read('itemsLabel')
  const counts = read('keysLabel')
  const render = read('renderValue')
  const lit = touched ? model.cursor : -1
  /* Worked out as what they read moves, since a list of ten thousand rows holds
     its drawn rows only while its data stands. */
  const rows = useMemo(
    () =>
      model.rows.map((row, at) => rowFields(row, at, at === lit, { items, keys: counts }, render)),
    [counts, items, lit, model.rows, render],
  )
  const current = model.rows[model.cursor]
  const copyText = useMemo(() => copyable(current), [current])
  return {
    marks: marksOf(model),
    parts: {
      host: {
        lists: { [boundTo(use, 'list', 'state') ?? 'rows']: rows },
        states: computedOf(read, use, model, copyText),
      },
      row: rowBinding(held, acts, touch, rowRef),
      rows: {
        windowed: {
          across: 1,
          gap: 0,
          horizontal: false,
          laid: (_width, height) => {
            standing.current.frame = height
          },
          listRef: (next) => {
            list.current = next
          },
          measured: () => undefined,
          moved: (offset, frame) => {
            standing.current = { frame, offset }
          },
          plain: !windowed,
          rows,
        },
      },
      'search-field': { view: { ref: fieldRef } },
    },
  }
}
