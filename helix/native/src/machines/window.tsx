/**
 * The window machine an element that declares a `window` runs, as a virtual
 * list does: the rows near the screen, what a press and a key do to them, and
 * where a reader stands in the set.
 *
 * **It reads core's arithmetic**, the same the web element reads, so a key
 * lands on the same item and a press leaves the same `value` on both
 * platforms. `FlatList` draws the rows, which a repeat marked `windowed` hands
 * it, and a waterfall stands them in a scroll view from core's `Waterfall`.
 */
import { announce } from '@fusion.dev/helix-core/capabilities/announce'
import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import {
  commaList,
  entryOf,
  headOf,
  keyOf,
  type Sections,
  sectionsOf,
  Typeahead,
  textsOf,
  Waterfall,
} from '@fusion.dev/helix-core/virtual-list'
import { formatMessage } from '@fusion.dev/helix-core/words'
import {
  type Ref,
  type RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, PartBinding, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { boundTo, given, tell, told } from './props'
import { type KeyAction, keyAction, pressedValue, type WindowState } from './window-keys'

/** One row a windowed repeat draws: a section's header, or an item. */
export interface WindowRow {
  readonly active: boolean
  /** The item's place in the set, or the section's among the sections. */
  readonly at: number
  readonly disabled: boolean
  readonly dragging: boolean
  readonly dropAfter: boolean
  readonly dropBefore: boolean
  readonly header: boolean
  readonly item: unknown
  readonly key: string
  readonly notHeader: boolean
  readonly section: string
  readonly selected: boolean
  readonly words: string
}

/** Where a waterfall stands one item. */
export interface WindowPlace {
  readonly left: number
  readonly top: number
  readonly width: number
}

/** What a finger held on a row drags it through. */
export interface WindowDrag {
  readonly end: () => void
  readonly move: (at: number, along: number) => void
  readonly start: (at: number) => void
}

/** Where a waterfall stands each item, and how long it is. */
export interface WindowWall {
  readonly extent: number
  readonly place: (at: number) => WindowPlace
  readonly reaching: (top: number, bottom: number) => readonly number[]
}

/** What a windowed repeat draws its list with, which the machine gives its part. */
export interface WindowDrawing {
  /** How many items a line holds. */
  readonly across: number
  /** What a finger held on a row drags it through, where the list lets a reader move items. */
  readonly dragging?: WindowDrag
  /** The space between two rows, and between two columns. */
  readonly gap: number
  /** Whether the list runs across. */
  readonly horizontal: boolean
  /** Hears the frame's width and height. */
  readonly laid: (width: number, height: number) => void
  /** Hands over the list, which moves to a row and scrolls. */
  readonly listRef: (list: WindowScroller | null) => void
  /** Hears a row's length once it is drawn, for a waterfall. */
  readonly measured: (at: number, height: number) => void
  /** Hears where the list stands, and how long its frame and content are. */
  readonly moved: (offset: number, frame: number, content: number) => void
  /** The rows, in order. */
  readonly rows: readonly WindowRow[]
  /** Where a waterfall stands each item, where the list is one. */
  readonly waterfall?: WindowWall
}

/** What the machine asks of the list it draws in. */
export interface WindowScroller {
  readonly scrollTo?: (to: { animated?: boolean; y: number }) => void
  readonly scrollToIndex?: (to: {
    animated?: boolean
    index: number
    viewPosition?: number
  }) => void
  readonly scrollToOffset?: (to: { animated?: boolean; offset: number }) => void
}

/** What a list's `ref` holds, as the web element's methods offer them. */
export interface WindowHandle {
  /** The items on screen, as `items.slice(first, last)` reads them. */
  readonly range: () => { readonly first: number; readonly last: number }
  /** Scrolls the list to show the item at `index`. */
  readonly scrollToIndex: (
    index: number,
    options?: {
      readonly align?: 'center' | 'end' | 'nearest' | 'start'
      readonly behavior?: string
    },
  ) => void
}

/** How near an edge of the frame a dragged row scrolls the list, in points. */
const DRAG_EDGE = 48

/** How far each move of a finger near an edge scrolls the list, in points. */
const DRAG_STEP = 16

/** The words of a move a screen reader hears, where the page names none. */
const MOVED = '{name} moved to position {position} of {count}'

/** Where `align` puts an item in the frame, as a share of what is left. */
const POSITION = { center: 0.5, end: 1, nearest: undefined, start: 0 } as const

/** A number a prop holds, or `fallback`. */
const numberOf = (value: unknown, fallback: number): number => {
  const read = typeof value === 'string' && value !== '' ? Number(value) : value
  return typeof read === 'number' && Number.isFinite(read) ? read : fallback
}

/** The words a prop holds. */
const wordsIn = (value: unknown): string => (typeof value === 'string' ? value : '')

/** What the list holds beside what a press and a key read. */
interface Latest extends WindowState {
  readonly estimate: number
  readonly gap: number
  readonly loading: boolean
  readonly props: Props
  readonly texts: readonly string[]
}

/** Where the list stands along the axis it scrolls. */
interface Standing {
  content: number
  frame: number
  offset: number
}

/** The events a window sends, by what each says. */
const eventsOf = (use: MachineUse) => ({
  before: boundTo(use, 'onBeforeChange', 'event'),
  beforeReorder: boundTo(use, 'onBeforeReorder', 'event'),
  change: boundTo(use, 'onChange', 'event'),
  loadMore: boundTo(use, 'onLoadMore', 'event'),
  range: boundTo(use, 'onRangeChange', 'event'),
  reorder: boundTo(use, 'onReorder', 'event'),
})

/** The items a frame shows, from how long a line is, as the web's window reads them. */
const inFrame = (now: Latest, standing: Standing): { first: number; last: number } => {
  const line = now.estimate + now.gap
  if (standing.frame <= 0 || line <= 0) {
    return { first: 0, last: 0 }
  }
  const lines = (at: number) => Math.floor(at / line) * now.across
  return {
    first: Math.min(now.count, lines(standing.offset)),
    last: Math.min(now.count, lines(standing.offset + standing.frame - 1) + now.across),
  }
}

/** The rows a set draws, with a header before each section. */
const rowsOf = (
  data: readonly unknown[],
  sections: Sections | undefined,
  item: (at: number) => WindowRow,
): readonly WindowRow[] => {
  if (sections === undefined) {
    return data.map((_, at) => item(at))
  }
  return sections.names.flatMap((name, index) => {
    const from = sections.starts[index] ?? 0
    const to = sections.starts[index + 1] ?? data.length
    return [
      {
        active: false,
        at: index,
        disabled: false,
        dragging: false,
        dropAfter: false,
        dropBefore: false,
        header: true,
        item: undefined,
        key: `head-${index}-${headOf(sections, index)}`,
        notHeader: false,
        section: name,
        selected: false,
        words: '',
      },
      ...Array.from({ length: to - from }, (_, offset) => item(from + offset)),
    ]
  })
}

/** Says what moved as the list does: the items on screen, and that the end is in sight. */
const useReport = (
  family: Family,
  use: MachineUse,
  latest: RefObject<Latest>,
  standing: RefObject<Standing>,
) => {
  const said = useRef({ first: 0, last: 0 })
  const askedAt = useRef(-1)
  const { loadMore, range } = eventsOf(use)
  return useCallback(() => {
    const now = latest.current
    const { first, last } = inFrame(now, standing.current)
    if ((first !== said.current.first || last !== said.current.last) && range) {
      said.current = { first, last }
      told(family, now.props, range, { first, last })
    }
    const { content, frame, offset } = standing.current
    const near = frame > 0 && content - frame - offset <= frame
    if (!now.loading && loadMore && now.count > 0 && askedAt.current !== now.count && near) {
      askedAt.current = now.count
      told(family, now.props, loadMore, {})
    }
  }, [family, latest, loadMore, range, standing])
}

/** Where a finger's travel from row `at` would land, scrolling the list near either edge. */
const dragged = (
  now: Latest,
  standing: Standing,
  list: WindowScroller | null,
  at: number,
  along: number,
): number => {
  const line = Math.max(1, now.estimate + now.gap)
  const point = at * line + along
  const shown = point - standing.offset
  const by = shown < DRAG_EDGE ? -DRAG_STEP : shown > standing.frame - DRAG_EDGE ? DRAG_STEP : 0
  if (by !== 0) {
    list?.scrollToOffset?.({ animated: false, offset: Math.max(0, standing.offset + by) })
  }
  return Math.max(0, Math.min(now.count - 1, Math.floor(point / line)))
}

/** A finger held on a row lifts it, and its travel says where it would land. */
const useDrag = (
  latest: RefObject<Latest>,
  standing: RefObject<Standing>,
  list: RefObject<WindowScroller | null>,
  reorder: (from: number, to: number) => void,
) => {
  const [drag, setDrag] = useState<{ from: number; to: number } | undefined>(undefined)
  const held = useRef<{ from: number; to: number } | undefined>(undefined)
  const dragging = useMemo<WindowDrag>(
    () => ({
      end: () => {
        const was = held.current
        held.current = undefined
        setDrag(undefined)
        if (was !== undefined) {
          reorder(was.from, was.to)
        }
      },
      /* Near either edge of the frame the list scrolls, so a far place is
         reached by dragging there, as the web's does. */
      move: (at, along) => {
        const was = held.current
        if (was !== undefined) {
          const to = dragged(latest.current, standing.current, list.current, at, along)
          if (to !== was.to) {
            held.current = { ...was, to }
            setDrag({ from: was.from, to })
          }
        }
      },
      start: (at) => {
        held.current = { from: at, to: at }
        setDrag({ from: at, to: at })
      },
    }),
    [latest, list, reorder, standing],
  )
  return { drag, dragging }
}

/** Each drawn row's view, which hears its keys, and takes focus as a move reaches it. */
const useRowViews = (onKey: (at: number, pressed: KeyPress) => boolean) => {
  const views = useRef(new Map<number, unknown>()).current
  const listeners = useRef(new Map<number, () => void>()).current
  const moveTo = useRef<number | undefined>(undefined)
  const heard = useRef(onKey)
  heard.current = onKey
  useEffect(
    () => () => {
      for (const stop of listeners.values()) {
        stop()
      }
      listeners.clear()
    },
    [listeners],
  )
  const rowRef = useCallback(
    (at: number) => (node: unknown) => {
      listeners.get(at)?.()
      listeners.delete(at)
      if (node === null) {
        views.delete(at)
        return
      }
      views.set(at, node)
      listeners.set(
        at,
        keys().listen(node, (pressed) => heard.current(at, pressed)),
      )
      if (moveTo.current === at) {
        moveTo.current = undefined
        focus().focus(node, false)
      }
    },
    [listeners, views],
  )
  return { moveTo, rowRef, views }
}

/** A waterfall's places, each item under the column that ends highest, by the length measured or the estimate. */
const useWall = (
  on: boolean,
  lanes: Waterfall,
  columns: number,
  count: number,
  size: { readonly estimate: number; readonly frameWidth: number; readonly gap: number },
  lengths: ReadonlyMap<number, number>,
): WindowWall | undefined =>
  useMemo(() => {
    if (!on) {
      return undefined
    }
    const { estimate, frameWidth, gap } = size
    lanes.lanes = columns
    const stamp = [...lengths.entries()].map(([at, height]) => `${at}:${height}`).join(',')
    lanes.place(count, (at) => (lengths.get(at) ?? estimate) + gap, stamp)
    const width = frameWidth > 0 ? (frameWidth - gap * (columns - 1)) / columns : 0
    return {
      extent: lanes.length(),
      place: (at) => ({
        left: lanes.lane(at) * (width + gap),
        top: lanes.start(at),
        width,
      }),
      reaching: (top, bottom) => {
        const reached: number[] = []
        for (let at = 0; at < count && lanes.start(at) <= bottom; at += 1) {
          if (lanes.start(at) + (lengths.get(at) ?? estimate) >= top) {
            reached.push(at)
          }
        }
        return reached
      },
    }
  }, [columns, count, lanes, lengths, on, size])

/** What the props lay out, read once a render. */
const useLayout = (family: Family, props: Props, use: MachineUse, frameWidth: number) => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const items = read('items')
  const data = useMemo(() => (Array.isArray(items) ? (items as readonly unknown[]) : []), [items])
  const gap = Math.max(0, numberOf(read('gap'), 0))
  const minColumn = numberOf(read('minColumnWidth'), 0)
  const waterfall = wordsIn(read('layout')) === 'waterfall'
  const columns =
    minColumn > 0 && frameWidth > 0
      ? Math.max(1, Math.floor((frameWidth + gap) / (minColumn + gap)))
      : Math.max(1, Math.trunc(numberOf(read('columns'), 1)) || 1)
  const across = waterfall ? 1 : columns
  const sectionField = wordsIn(read('sectionField'))
  const sections = useMemo(
    () =>
      sectionField === '' || data.length === 0 || columns !== 1 || waterfall
        ? undefined
        : sectionsOf(data, sectionField),
    [columns, data, sectionField, waterfall],
  )
  const keyField = wordsIn(read('keyField'))
  const textField = wordsIn(read('textField'))
  const keysOfItems = useMemo(
    () => data.map((item, at) => keyOf(item, at, keyField)),
    [data, keyField],
  )
  const disabledKeys = wordsIn(read('disabledKeys'))
  const off = useMemo(() => new Set(commaList(disabledKeys)), [disabledKeys])
  const texts = useMemo(
    () => textsOf(data, textField).map((text, at) => (off.has(keysOfItems[at] ?? '') ? '' : text)),
    [data, keysOfItems, off, textField],
  )
  return {
    across,
    behavior: wordsIn(read('selectionBehavior')) || 'toggle',
    columns,
    data,
    estimate: numberOf(read('estimate'), 32),
    gap,
    horizontal: wordsIn(read('orientation')) === 'horizontal' && across === 1 && !waterfall,
    keysOfItems,
    loading: read('loading') === true,
    mode: wordsIn(read('selectionMode')),
    off,
    reorderable: read('reorderable') === true,
    sections,
    texts,
    value: wordsIn(read('value')),
    waterfall,
  }
}

/** The list's choice: the page's writes of `value` win, as the web element's property does. */
const useChosen = (value: string) => {
  const [chosen, setChosen] = useState(value)
  const written = useRef(value)
  if (written.current !== value) {
    written.current = value
    setChosen(value)
  }
  return [chosen, setChosen] as const
}

/** A row's accessibility, by the list's mode. */
const rowSemantics = (mode: string, row: WindowRow): Readonly<Record<string, unknown>> => {
  if (mode !== '') {
    return {
      accessibilityRole: 'button',
      accessibilityState: { ...(row.disabled ? { disabled: true } : {}), selected: row.selected },
    }
  }
  return row.disabled ? { accessibilityState: { disabled: true } } : {}
}

/** What a screen reader moves an item by. */
const moveActions = (at: number, reorder: (from: number, to: number) => void) => ({
  accessibilityActions: [
    { label: 'Move up', name: 'decrement' },
    { label: 'Move down', name: 'increment' },
  ],
  onAccessibilityAction: (event: { readonly nativeEvent: { readonly actionName: string } }) =>
    reorder(at, event.nativeEvent.actionName === 'decrement' ? at - 1 : at + 1),
})

/** Whether a key types a letter of a search: Space only continues one. */
const typed = (pressed: KeyPress, typeahead: Typeahead): boolean =>
  [...pressed.key].length === 1 &&
  !(pressed.control || pressed.meta || pressed.alt) &&
  (pressed.key !== ' ' || typeahead.typing())

/** Runs what a key does. */
const run = (
  action: KeyAction,
  at: number,
  to: {
    readonly choose: (value: string) => void
    readonly focusIndex: (at: number) => void
    readonly press: (at: number, extend?: boolean, toggle?: boolean) => void
    readonly reorder: (from: number, to: number) => void
  },
): boolean => {
  switch (action.kind) {
    case 'choose':
      to.choose(action.value)
      break
    case 'press':
      to.press(action.at, action.extend, action.toggle)
      break
    case 'reorder':
      to.reorder(at, action.to)
      break
    case 'step':
      to.focusIndex(action.to)
      if (action.extend || action.press) {
        to.press(action.to, action.extend)
      }
      break
    default:
  }
  return true
}

/** What each row's view takes from the machine. */
const rowBinding = ({
  mode,
  press,
  reorder,
  reorderable,
  rowRef,
  setActive,
}: {
  readonly mode: string
  readonly press: (at: number) => void
  readonly reorder: (from: number, to: number) => void
  readonly reorderable: boolean
  readonly rowRef: (at: number) => (node: unknown) => void
  readonly setActive: (at: number) => void
}): PartBinding => ({
  copy: (entry) => {
    const one = entry.fields as unknown as WindowRow
    return {
      ...rowSemantics(mode, one),
      ...(reorderable ? moveActions(one.at, reorder) : {}),
      focusable: one.active,
      onFocus: () => setActive(one.at),
      onPress: () => {
        setActive(one.at)
        if (mode !== '' && !one.disabled) {
          press(one.at)
        }
      },
      ref: rowRef(one.at),
    }
  },
})

/** Asks for a move of an item, and says it once it stands. */
const useReorder = (
  family: Family,
  use: MachineUse,
  latest: RefObject<Latest>,
  landed: RefObject<(to: number) => void>,
) => {
  const { beforeReorder, reorder: after } = eventsOf(use)
  return useCallback(
    (from: number, to: number) => {
      const now = latest.current
      if (from === to || to < 0 || to >= now.count) {
        return
      }
      const order = [...now.keysOfItems]
      const [moved] = order.splice(from, 1)
      if (moved === undefined) {
        return
      }
      order.splice(to, 0, moved)
      const detail = { from, key: moved, keys: order, kind: 'item', to, value: order.join(',') }
      if (beforeReorder && !tell(family, now.props, beforeReorder, detail)) {
        return
      }
      if (after) {
        told(family, now.props, after, detail)
      }
      landed.current(to)
      const sentence = wordsIn(given(family, now.props, 'moved-label')) || MOVED
      const values = { count: now.count, name: now.texts[from] ?? '', position: to + 1 }
      announce().say(formatMessage(sentence, values, ''), 'polite')
    },
    [after, beforeReorder, family, landed, latest],
  )
}

/** What a press on a row chooses: `value` asks first, and holds where it stands. */
const useChoice = (
  family: Family,
  use: MachineUse,
  latest: RefObject<Latest>,
  setChosen: (value: string) => void,
) => {
  const { before, change } = eventsOf(use)
  const anchor = useRef<string | undefined>(undefined)
  const choose = useCallback(
    (next: string) => {
      const now = latest.current
      if (next === now.chosen || (before && !tell(family, now.props, before, { value: next }))) {
        return
      }
      latest.current = { ...now, chosen: next }
      setChosen(next)
      if (change) {
        told(family, now.props, change, {})
      }
    },
    [before, change, family, latest, setChosen],
  )
  const press = useCallback(
    (at: number, extend = false, toggle = false) => {
      const now = latest.current
      const next = pressedValue(now, at, anchor.current, extend, toggle)
      const key = now.keysOfItems[at]
      if (!(extend && now.mode === 'multiple') && key !== undefined && !now.off.has(key)) {
        anchor.current = key
      }
      if (next !== undefined) {
        choose(next)
      }
    },
    [choose, latest],
  )
  return { anchor, choose, press }
}

/** The rows of the set, as what is chosen and where the keys are mark them. */
const useRows = (
  layout: ReturnType<typeof useLayout>,
  chosen: string,
  stop: number,
  drag: { readonly from: number; readonly to: number } | undefined,
): readonly WindowRow[] => {
  const { data, keysOfItems, off, sections, texts } = layout
  const held = useMemo(() => new Set(commaList(chosen)), [chosen])
  return useMemo(
    () =>
      rowsOf(data, sections, (at) => {
        const key = keysOfItems[at] ?? String(at)
        return {
          active: at === stop,
          at,
          disabled: off.has(key),
          dragging: drag?.from === at,
          dropAfter: drag !== undefined && drag.to === at && drag.to > drag.from,
          dropBefore: drag !== undefined && drag.to === at && drag.to < drag.from,
          header: false,
          item: data[at],
          key: `item-${key}-${at}`,
          notHeader: true,
          section: '',
          selected: held.has(key),
          words: texts[at] ?? '',
        }
      }),
    [data, drag, held, keysOfItems, off, sections, stop, texts],
  )
}

/**
 * Hosts the window: `items`, laid out by its props, with what a press, a key,
 * and a scroll do. The rows hold the chosen and the active item, so a change
 * draws each again.
 */
export const useWindow = (
  family: Family,
  props: Props,
  use: MachineUse,
): { readonly behavior: Behavior; readonly handle: WindowHandle } => {
  const [frameWidth, setFrameWidth] = useState(0)
  const layout = useLayout(family, props, use, frameWidth)
  const [chosen, setChosen] = useChosen(layout.value)
  const [active, setActive] = useState(0)
  const [lengths, setLengths] = useState<ReadonlyMap<number, number>>(new Map())
  const lanes = useRef(new Waterfall()).current
  const list = useRef<WindowScroller | null>(null)
  const typeahead = useRef(new Typeahead()).current
  const standing = useRef<Standing>({ content: 0, frame: 0, offset: 0 })
  const current: Latest = { ...layout, chosen, count: layout.data.length, props }
  const latest = useRef(current)
  latest.current = current
  const report = useReport(family, use, latest, standing)
  const { anchor, choose, press } = useChoice(family, use, latest, setChosen)

  /** Scrolls item `at` into view. */
  const reveal = useCallback(
    (at: number, viewPosition?: number, animated = false) => {
      const now = latest.current
      if (now.waterfall) {
        list.current?.scrollTo?.({ animated, y: lanes.start(at) })
        return
      }
      list.current?.scrollToIndex?.({
        animated,
        index: now.sections ? entryOf(now.sections, at) : Math.floor(at / now.across),
        ...(viewPosition === undefined ? {} : { viewPosition }),
      })
    },
    [lanes],
  )

  const onKey = useRef<(at: number, pressed: KeyPress) => boolean>(() => false)
  const { moveTo, rowRef, views } = useRowViews((at, pressed) => onKey.current(at, pressed))
  const landed = useRef((to: number) => {
    setActive(to)
    moveTo.current = to
  })
  const reorder = useReorder(family, use, latest, landed)

  /** Moves the keys to item `at`, drawn or not: the list goes there and focus lands as it draws. */
  const focusIndex = useCallback(
    (at: number) => {
      setActive(at)
      const view = views.get(at)
      if (view === undefined) {
        moveTo.current = at
      } else {
        focus().focus(view, false)
      }
      reveal(at)
    },
    [moveTo, reveal, views],
  )

  onKey.current = (at, pressed) => {
    const now = latest.current
    if (pressed.claimed) {
      return false
    }
    if (typed(pressed, typeahead)) {
      const found = typeahead.match(pressed.key, now.texts, at)
      if (found >= 0 && found !== at) {
        focusIndex(found)
      }
      return true
    }
    const { first, last } = inFrame(now, standing.current)
    const action = keyAction(now, at, pressed, last - first - 1, (way, from) =>
      lanes.step(way, from, now.count, standing.current.frame),
    )
    if (action?.kind === 'step' && action.extend) {
      anchor.current ??= now.keysOfItems[at]
    }
    return action !== undefined && run(action, at, { choose, focusIndex, press, reorder })
  }

  const { drag, dragging } = useDrag(latest, standing, list, reorder)
  const { across, columns, data, estimate, gap, horizontal, mode, reorderable, waterfall } = layout
  const rows = useRows(layout, chosen, Math.min(active, Math.max(0, data.length - 1)), drag)

  const measured = useCallback((at: number, height: number) => {
    setLengths((was) => (was.get(at) === height ? was : new Map(was).set(at, height)))
  }, [])
  const moved = useCallback(
    (offset: number, frame: number, content: number) => {
      standing.current = { content, frame, offset }
      report()
    },
    [report],
  )
  const laid = useCallback(
    (width: number, height: number) => {
      setFrameWidth(width)
      standing.current.frame = latest.current.horizontal ? width : height
      report()
    },
    [report],
  )
  const listRef = useCallback((next: WindowScroller | null) => {
    list.current = next
  }, [])

  const handle = useMemo<WindowHandle>(
    () => ({
      range: () => inFrame(latest.current, standing.current),
      scrollToIndex: (index, options = {}) => {
        const { count } = latest.current
        if (count > 0 && Number.isFinite(index)) {
          const at = Math.max(0, Math.min(Math.trunc(index), count - 1))
          reveal(at, POSITION[options.align ?? 'nearest'], options.behavior === 'smooth')
        }
      },
    }),
    [reveal],
  )
  useImperativeHandle(props.ref as Ref<WindowHandle> | undefined, () => handle, [handle])

  const size = useMemo(() => ({ estimate, frameWidth, gap }), [estimate, frameWidth, gap])
  const wall = useWall(waterfall, lanes, columns, data.length, size, lengths)

  const drawing: WindowDrawing = {
    across,
    gap,
    horizontal,
    laid,
    listRef,
    measured,
    moved,
    rows,
    ...(reorderable ? { dragging } : {}),
    ...(wall === undefined ? {} : { waterfall: wall }),
  }
  const marks = [
    data.length === 0 ? boundTo(use, 'empty', 'state') : undefined,
    horizontal ? boundTo(use, 'horizontal', 'state') : undefined,
    layout.loading ? boundTo(use, 'loadingState', 'state') : undefined,
  ].filter((mark) => mark !== undefined)
  const row = rowBinding({ mode, press, reorder, reorderable, rowRef, setActive })
  return {
    behavior: {
      marks,
      parts: {
        host: {
          lists: { [boundTo(use, 'list', 'state') ?? 'rows']: rows },
          states: { chosen },
        },
        row,
        rows: { windowed: drawing },
      },
    },
    handle,
  }
}
