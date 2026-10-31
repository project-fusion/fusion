/**
 * The machine a table runs on a phone: its columns and rows, what is sorted,
 * selected, and open, the one set of tracks its rows line up under, and the
 * horizontal scroll a wide table moves in with its first column pinned.
 *
 * **The rows are the page's elements**, each drawn where the table says, with
 * what the table says of it in a context. `FlatList` draws those near the screen
 * under `windowed`. Decision 12: no stacked-card variant, and each cell is named
 * with its column's heading for a screen reader.
 */
import { measure } from '@fusion.dev/helix-core/capabilities/measure'
import { openLink } from '@fusion.dev/helix-core/capabilities/open-link'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import {
  commaList,
  everyState,
  inRowOrder,
  nestedRows,
  parse,
  rowShapes,
  sortedRows,
  treeArrow,
} from '@fusion.dev/helix-core/table'
import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Dimensions, type HostInstance, type LayoutChangeEvent } from 'react-native'
import Reanimated, {
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import type { MachineUse } from '../ir.generated'
import type { Behavior, PartBinding, Props } from '../render/behavior'
import { carryIntoLayers } from '../render/carry'
import { direction } from '../render/styles'
import type { Family } from '../style/form'
import { useTheme } from '../theme/theme'
import { boundTo, given, tell } from './props'
import { ask, reader, useChoice, useHeld, useSaid, useSorting } from './table-choice'
import { activating, rangeTo, useGrid } from './table-grid'
import {
  type ColumnModel,
  modelOf,
  noStanding,
  type RowModel,
  type Standing,
  tracksFor,
} from './table-model'
import { type MoveState, useMoves } from './table-moves'
import { readsContent, trackWidths } from './table-tracks'
import { worded, wordOf } from './table-words'
import type { DrawnRow, WindowDrawing } from './window'

/** What a row of a table reads of where it stands. */
export interface RowPlace {
  readonly at: number
  readonly branch: boolean
  readonly level: number
  readonly move: MoveState
  readonly open: boolean
  readonly row: RowModel
  readonly selected: boolean
}

/** What a table offers the rows and columns drawn in it. */
export interface TableOffer {
  /** A cell's box props: its width, and what measures it. */
  readonly box: (id: string, track: number, words: string) => Readonly<Record<string, unknown>>
  readonly columns: readonly ColumnModel[]
  readonly grid: boolean
  /** A cell's props in a grid: the stop, and its keys. */
  readonly gridCell: (row: number, column: number) => Readonly<Record<string, unknown>>
  /** The columns drawn before the cells. */
  readonly lead: readonly string[]
  /** How far the first column stands from the start. */
  readonly leadWidth: number
  /** A column's width was asked for. */
  readonly resize: (column: string, value: string) => void
  /** How far the rows overflow the frame. */
  readonly over: number
  /** A row's press, where it does anything. */
  readonly rowPress: ((row: RowModel) => void) | undefined
  readonly scroll: SharedValue<number>
  /** A row's checkbox asked to change. */
  readonly choose: (key: string, on: boolean) => void
  /** A press on a disclosure button. */
  readonly disclose: (key: string) => void
  /** A grip. */
  readonly grip: {
    readonly drag: {
      readonly end: (dropped: boolean) => void
      readonly move: (travel: number, pageY: number) => void
      readonly start: (key: string, grip: HostInstance | null) => void
    }
    readonly key: (key: string, press: KeyPress) => boolean
    readonly measured: (key: string, height: number) => void
    readonly move: (key: string, by: number) => void
    readonly pick: (key: string) => void
    readonly still: boolean
  }
  /** The words of a words prop, formatted, which a row reads of its table. */
  readonly said: (name: string, values: Readonly<Record<string, unknown>>) => string
  readonly sort: string
  /** A press on a sortable heading. */
  readonly toggleSort: (field: string) => void
  /** Each track's width. */
  readonly widths: readonly number[] | undefined
  /** The whole width of the rows. */
  readonly total: number | undefined
}

/** The table a row or a column stands in. */
export const TableContext = createContext<TableOffer | undefined>(undefined)

/** Where a row stands. */
export const RowContext = createContext<RowPlace | undefined>(undefined)

/** Which column a heading is. */
export const ColumnContext = createContext<
  | { readonly column: ColumnModel; readonly track: number; readonly sorted: string | undefined }
  | undefined
>(undefined)

carryIntoLayers(TableContext)

/** A row or a heading a repeat draws: its key, and what it draws. */
export interface TableEntry extends DrawnRow {
  readonly draw: () => ReactNode
  readonly pinned: boolean
}

/** The rows in the order they are drawn. */
const arranged = (
  rows: readonly RowModel[],
  columns: readonly ColumnModel[],
  sort: string,
  open: ReadonlySet<string>,
): readonly RowModel[] => {
  const spec = parse(sort)
  const index = spec
    ? columns.findIndex((column) => column.sortable && column.field === spec.field)
    : -1
  const ordered =
    spec && index >= 0 ? sortedRows(rows, sort, (row) => row.cells[index]?.words ?? '') : rows
  return rows.some((row) => row.parent !== '') ? nestedRows(ordered, open) : ordered
}

/** The tracks: what each reads, what it measured, and each one's width. */
const useTracksOf = (written: readonly string[], standing: Standing) => {
  const theme = useTheme()
  const [frame, setFrame] = useState<number>()
  const [, redraw] = useState(0)
  const reading = written.flatMap((track, at) => (readsContent(track) ? [at] : []))
  const ready = frame !== undefined && reading.every((at) => standing.contents[at] !== undefined)
  const widths = ready
    ? trackWidths(written, standing.contents, frame, { em: theme.rem * 0.875, rem: theme.rem })
    : undefined
  const report = useCallback(
    (id: string, words: string, track: number, width: number) => {
      standing.measured.set(id, words)
      standing.contents[track] = Math.max(standing.contents[track] ?? 0, Math.ceil(width))
      if (!standing.scheduled) {
        standing.scheduled = true
        void Promise.resolve().then(() => {
          standing.scheduled = false
          redraw((at) => at + 1)
        })
      }
    },
    [standing],
  )
  return { frame, reading: new Set(reading), report, setFrame, widths }
}

/** Draws each heading in the place the table says, and each row in its. */
const useEntries = (
  columns: readonly ColumnModel[],
  rows: readonly RowModel[],
  sort: string,
  places: (row: RowModel, at: number) => RowPlace,
  lead: readonly string[],
) => {
  const spec = parse(sort)
  const heads: TableEntry[] = columns.map((column, at) => ({
    at,
    draw: () => (
      <ColumnContext.Provider
        key={column.key}
        value={{
          column,
          sorted:
            spec && column.sortable && column.field === spec.field
              ? spec.direction === 'asc'
                ? 'ascending'
                : 'descending'
              : undefined,
          track: lead.length + at,
        }}
      >
        {column.element}
      </ColumnContext.Provider>
    ),
    header: false,
    key: column.key,
    pinned: at === 0,
  }))
  const entries: TableEntry[] = rows.map((row, at) => ({
    at,
    draw: () => (
      <RowContext.Provider key={row.key} value={places(row, at)}>
        {row.element}
      </RowContext.Provider>
    ),
    header: false,
    key: row.key,
    pinned: false,
  }))
  return { entries, heads }
}

/** Sends `load-more` once for each number of rows, and never while loading. */
const useLoadMore = (
  family: Family,
  props: Props,
  use: MachineUse,
  count: number,
  standing: Standing,
) => {
  const read = reader(family, props, use)
  const on = read('loadMore') === true
  const loading = given(family, props, 'loading') === true
  const sends = boundTo(use, 'onLoadMore', 'event')
  return () => {
    if (on && !loading && standing.asked !== count && sends !== undefined) {
      standing.asked = count
      tell(family, props, sends, {})
    }
  }
}

/** How often a table with no list of its own looks for its end, in milliseconds. */
const LOOK = 400

/**
 * Watches the end of a table the page scrolls come within a screen of view. **A
 * table has no word of a scroll around it on a phone**, so it reads its own box
 * on a timer, and only while it is asked to load more.
 */
const useEndInSight = (on: boolean, nearEnd: () => void) => {
  const node = useRef<unknown>(null)
  const latest = useRef(nearEnd)
  latest.current = nearEnd
  useEffect(() => {
    if (!on) {
      return undefined
    }
    const look = (): void => {
      const box = node.current === null ? null : measure().box(node.current)
      if (box !== null && box.y + box.height <= Dimensions.get('window').height * 2) {
        latest.current()
      }
    }
    look()
    const timer = setInterval(look, LOOK)
    return () => clearInterval(timer)
  }, [on])
  return useCallback((view: unknown) => {
    node.current = view
  }, [])
}

/** What a repeat marked `windowed` draws the rows with. */
const drawingOf = (
  windowed: boolean,
  entries: readonly TableEntry[],
  nearEnd: () => void,
  moves: Pick<TableState['moves'], 'edge' | 'held'>,
): WindowDrawing => ({
  across: 1,
  gap: 0,
  ...(moves.held === undefined ? {} : { held: moves.held }),
  horizontal: false,
  laid: () => undefined,
  listRef: moves.edge.listRef,
  measured: () => undefined,
  moved: (offset, frame, content) => {
    moves.edge.moved(offset)
    if (offset + frame * 2 >= content) {
      nearEnd()
    }
  },
  plain: !windowed,
  rows: entries,
})

/**
 * How far the first column shifts to stand still at the frame's start, as sticky
 * does: past the columns before it, and on the other edge right to left, where
 * the scroll starts at its end. `over` is how far the rows overflow the frame.
 */
export const pinShift = (scroll: number, lead: number, over: number, rtl: boolean): number => {
  'worklet'
  return rtl ? Math.min(0, scroll - over + lead) : Math.max(0, scroll - lead)
}

/** A style that holds a box still once the table scrolls past the columns before it. */
export const usePin = (offer: Pick<TableOffer, 'leadWidth' | 'over' | 'scroll'> | undefined) => {
  const scroll = offer?.scroll
  const lead = offer?.leadWidth ?? 0
  const over = offer?.over ?? 0
  const rtl = direction() === 'rtl'
  return useAnimatedStyle(() => ({
    transform: [{ translateX: pinShift(scroll?.value ?? 0, lead, over, rtl) }],
  }))
}

/** The horizontal scroll a table stands in, whose offset pins the first column. */
const useAcross = (): {
  readonly scroll: SharedValue<number>
  readonly wrap: NonNullable<PartBinding['wrap']>
} => {
  const scroll = useSharedValue(0)
  const onScroll = useAnimatedScrollHandler((event) => {
    scroll.value = event.contentOffset.x
  })
  const wrap = useCallback(
    (view: ReactNode) => (
      <Reanimated.ScrollView
        horizontal
        nestedScrollEnabled
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {view}
      </Reanimated.ScrollView>
    ),
    [onScroll],
  )
  return { scroll, wrap }
}

/** What a table works out of what it holds and what a reader chose. */
const useStanding = (family: Family, props: Props, use: MachineUse) => {
  const read = reader(family, props, use)
  const standing = useRef<Standing>(noStanding()).current
  const { columns, rows } = useMemo(() => modelOf(props.children), [props.children])
  const sorting = useSorting(family, props, use)
  const [selected, setSelected] = useHeld(read('selected'), read('defaultSelected'))
  const [expanded, setExpanded] = useHeld(read('expanded'), read('defaultExpanded'))
  const open = new Set(commaList(expanded))
  const nests = rows.some((row) => row.parent !== '')
  const selectable = read('selectable') === true
  const shapes = useMemo(() => rowShapes(rows), [rows])
  const lead = [
    ...(read('reorderable') === true ? ['grip'] : []),
    ...(selectable ? ['select'] : []),
    ...(nests ? ['expand'] : []),
  ]
  const [resized, setResized] = useState<Readonly<Record<string, string>>>({})
  const written = [
    ...lead.map(() => 'max-content'),
    ...tracksFor(columns, rows, String(read('columns') ?? ''), resized),
  ]
  const tracks = useTracksOf(written, standing)
  const everyKey = rows.map((row) => row.key)
  const discloseRow = (key: string): void => {
    const next = new Set(open)
    if (!next.delete(key)) {
      next.add(key)
    }
    const value = inRowOrder(next, everyKey).join(',')
    ask(family, props, use, ['onBeforeExpand', 'onExpand'], value, () => setExpanded(value))
  }
  return {
    choice: useChoice(family, props, use, rows, selected, setSelected, standing),
    columns,
    discloseRow,
    drawn: arranged(rows, columns, sorting.sort, open),
    lead,
    moves: useMoves(family, props, use, rows, parse(sorting.sort) !== undefined),
    nests,
    open,
    rows,
    selectable,
    selected,
    setResized,
    shapes,
    sorting,
    standing,
    tracks,
  }
}

type TableState = ReturnType<typeof useStanding>

/** Right or Left on a disclosure cell: done, a row to move to, or neither. */
const disclosing =
  ({ discloseRow, drawn, open, shapes }: TableState) =>
  (at: number, forward: boolean): boolean | number => {
    const row = drawn[at]
    if (row === undefined) {
      return false
    }
    const arrow = treeArrow(
      { branch: shapes.get(row.key)?.branch ?? false, open: open.has(row.key) },
      forward ? 1 : -1,
    )
    if (arrow === 'open' || arrow === 'close') {
      discloseRow(row.key)
      return true
    }
    const parent = arrow === 'parent' ? drawn.findIndex((one) => one.key === row.parent) : -1
    return parent >= 0 ? parent : false
  }

/** What the keys of a grid do to the table. */
const gridActions = (state: TableState) => {
  const { choice, columns, discloseRow, drawn, lead, moves, selectable, shapes, sorting } = state
  return {
    activate: activating(
      drawn,
      columns,
      lead,
      shapes,
      choice,
      sorting,
      discloseRow,
      selectable,
      moves.grip.pick,
    ),
    arrive: (to: number, toggle: boolean) => {
      const row = drawn[to]
      if (choice.replaces && !toggle && row !== undefined) {
        choice.only(row.key)
      }
    },
    disclose: disclosing(state),
    selectAll: () => {
      if (!selectable || choice.single) {
        return false
      }
      choice.request(new Set([...choice.chosen, ...choice.enabled]))
      return true
    },
    selectRange: rangeTo(drawn, choice, state.standing, selectable),
  }
}

/** A cell's box props: its track's width, and what measures it until it has. */
const boxOf =
  ({ standing, tracks }: TableState) =>
  (id: string, track: number, words: string): Readonly<Record<string, unknown>> => {
    if (tracks.reading.has(track) && standing.measured.get(id) !== words) {
      return {
        onLayout: (event: LayoutChangeEvent) =>
          tracks.report(id, words, track, event.nativeEvent.layout.width),
      }
    }
    const width = tracks.widths?.[track]
    return width === undefined ? {} : { style: { width } }
  }

/** What a row reads of where it stands. */
const placeOf =
  ({ choice, moves, nests, open, selectable, shapes }: TableState) =>
  (row: RowModel, at: number): RowPlace => {
    const shape = shapes.get(row.key)
    return {
      at,
      branch: shape?.branch ?? false,
      level: nests ? (shape?.level ?? 1) : 0,
      move: moves.moveOf(row.key),
      open: open.has(row.key),
      row,
      selected: selectable && choice.chosen.has(row.key),
    }
  }

/** A press on a row: a drop, what `replace` selects, or its link. */
const rowPressOf =
  ({ choice, moves }: TableState) =>
  (row: RowModel): void => {
    if (moves.dropOn(row.key) || row.disabled) {
      return
    }
    if (choice.replaces) {
      choice.only(row.key)
    } else if (row.href !== '') {
      void openLink().open(row.href)
    }
  }

/** What the table offers what is drawn in it. */
const offerOf = (
  family: Family,
  props: Props,
  state: TableState,
  rest: {
    readonly grid: boolean
    readonly gridCell: TableOffer['gridCell']
    readonly reorderable: boolean
    readonly scroll: SharedValue<number>
  },
): TableOffer => {
  const { choice, columns, discloseRow, lead, moves, rows, sorting, tracks } = state
  const { widths } = tracks
  const total = widths?.reduce((sum, one) => sum + one, 0)
  const presses = choice.replaces || rest.reorderable || rows.some((row) => row.href !== '')
  return {
    box: boxOf(state),
    choose: choice.choose,
    columns,
    disclose: discloseRow,
    grid: rest.grid,
    gridCell: rest.gridCell,
    grip: moves.grip,
    lead,
    leadWidth: lead.reduce((sum, _, at) => sum + (widths?.[at] ?? 0), 0),
    over: Math.max(0, (total ?? 0) - (tracks.frame ?? 0)),
    resize: (column, value) => state.setResized((was) => ({ ...was, [column]: value })),
    rowPress: presses ? rowPressOf(state) : undefined,
    said: (name, values) => worded(family, props, name, values),
    scroll: rest.scroll,
    sort: sorting.sort,
    toggleSort: sorting.toggleSort,
    total,
    widths,
  }
}

/** Hosts a table. */
export const useTable = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read = reader(family, props, use)
  const [, tick] = useState(0)
  const redraw = useCallback(() => tick((at) => at + 1), [])
  const state = useStanding(family, props, use)
  const { choice, columns, drawn, lead, nests, rows, selected, selectable, sorting, tracks } = state
  const { standing } = state
  const windowed = read('windowed') === true
  const grid = read('grid') === true
  useSaid(family, props, sorting.sort, selected, choice.chosen.size, columns)
  const keysOn = useGrid(grid, drawn, columns, lead, standing, redraw, gridActions(state))
  const across = useAcross()
  const offer = offerOf(family, props, state, {
    grid,
    gridCell: keysOn.gridCell,
    reorderable: read('reorderable') === true,
    scroll: across.scroll,
  })
  const pin = usePin(offer)
  const entries = useEntries(columns, drawn, sorting.sort, placeOf(state), lead)
  const nearEnd = useLoadMore(family, props, use, rows.length, standing)
  const endRef = useEndInSight(read('loadMore') === true && !windowed, nearEnd)
  const every = everyState(choice.chosen, choice.enabled)
  const errorText = String(given(family, props, 'errorText') ?? '')
  const loading = given(family, props, 'loading') === true
  const emptyText = String(given(family, props, 'emptyText') ?? '')
  const leadPart = (part: string, at: number): PartBinding => ({
    states: { part },
    view: {
      testID: `table:head:${part}`,
      ...offer.box(`head/${at}`, at, ''),
      ...keysOn.gridCell(-1, at),
    },
  })
  return {
    marks: [],
    parts: {
      checkbox: {
        view: {
          ariaLabel: wordOf(family, props, 'selectAllLabel'),
          checked: every.checked,
          indeterminate: every.indeterminate,
          onBeforeCheck: (event: { preventDefault: () => void }) => {
            event.preventDefault()
            choice.chooseAll()
          },
        },
      },
      'expand-head': leadPart('expand-head', lead.indexOf('expand')),
      'grip-head': leadPart('grip-head', lead.indexOf('grip')),
      head: { view: offer.total === undefined ? {} : { style: { width: offer.total } } },
      'head-box': {
        animated: true,
        copy: (item) => {
          const track = lead.length + item.index
          const view = offer.box(`head/${track}`, track, columns[item.index]?.words ?? '')
          const own = (view as { readonly style?: unknown }).style
          return {
            testID: `table:head/${track}`,
            ...view,
            ...keysOn.gridCell(-1, track),
            style: item.index === 0 ? [own, pin] : own,
          }
        },
      },
      heads: {},
      host: {
        lists: { heads: entries.heads, rows: entries.entries },
        states: {
          chosen: selected,
          empty: rows.length === 0 && !loading && errorText === '' && emptyText !== '',
          error: errorText !== '',
          every: selectable && !choice.single,
          leadCount: String(lead.length),
          loading,
          nests,
          sorted: sorting.sort,
          waiting: loading && errorText === '',
        },
        view: {
          onLayout: (event: LayoutChangeEvent) => tracks.setFrame(event.nativeEvent.layout.width),
          ref: endRef,
        },
      },
      rows: { windowed: drawingOf(windowed, entries.entries, nearEnd, state.moves) },
      'select-all': leadPart('select-all', lead.indexOf('select')),
      table: {
        view: {
          accessibilityLabel: String(read('label') ?? '') || wordOf(family, props, 'fallbackLabel'),
          style: {
            opacity: tracks.widths === undefined && tracks.reading.size > 0 ? 0 : undefined,
            width: offer.total,
          },
        },
        wrap: across.wrap,
      },
    },
    provide: (inside) => <TableContext.Provider value={offer}>{inside}</TableContext.Provider>,
  }
}
