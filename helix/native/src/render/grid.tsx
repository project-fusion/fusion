/**
 * Draws a grid's cells on a phone, which has flexbox and no grid.
 *
 * **Measured, then laid out.** The grid reads its own width as it is laid
 * out and works each cell's column, width, and offset out from it with the
 * engine in `../grid`. Until it has a width, it draws its cells one to a
 * line, as a grid of one column does.
 *
 * **The cells wrap in one row of views, a line to each row of the grid.**
 * Each cell is as wide as the columns it spans, set off from the cell before
 * it by its offset, so a cell after a hole stands where the grid places it,
 * and the last cell of a row takes the rest of the line, so the next row
 * starts a line of its own. A line is as tall as its tallest cell, or as a
 * length sets its row, and at least the least a length sets, with the row
 * gap between lines. **The cells stay in
 * one view as the grid reflows**, so a cell that moves to another row keeps
 * what it holds and its state.
 *
 * A cell's content is laid out in it as `justify-items` says: stretched
 * across it by default, or at its start, center, or end. A line's cells are
 * as tall as the line unless `align-items` says otherwise, and a Helix
 * component passed in grows to fill its cell, as a grid item stretches on
 * the web.
 *
 * **A track sized by its content is measured.** A cell alone in such a
 * track is drawn at its own width once, and the track is then as wide as
 * the widest of them.
 */
import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useState,
} from 'react'
import { type LayoutChangeEvent, View } from 'react-native'
import {
  type Basis,
  type Cell,
  type Layout as Laid,
  layout,
  placementOf,
  type RowSize,
  trackList,
} from '../style/grid/layout'
import type { GridForm, Layout, Placing, Slotted } from '../style/resolved'

/** The props a cell's marker carries: where it goes, and the content it holds. */
interface Marked {
  readonly children: ReactNode
  readonly placement?: Placing
}

/**
 * A cell of a grid, as the region's content is handed to the grid: what it
 * holds and where it goes. It draws what it holds, and the grid reads where
 * it goes off its props.
 */
export const GridCell = ({ children }: Marked): ReactNode => children

/** An attribute selector `[name="value"]` or `[name]`, as a grid's `::slotted()` rules write one. */
const ATTRIBUTE = /^\[([\w-]+)(?:="([^"]*)")?\]$/

/** Whether a child's props hold what an attribute selector asks for. */
const holds = (selector: string, props: Readonly<Record<string, unknown>>): boolean => {
  const match = ATTRIBUTE.exec(selector)
  if (match === null) {
    return false
  }
  const [, name = '', value] = match
  const set = props[name]
  return value === undefined
    ? set !== undefined && set !== false && set !== null
    : set !== undefined && set !== null && String(set) === value
}

/**
 * Where a child goes, from what the host's `::slotted()` rules give it: the
 * rules for any child, for its tag, and for an attribute its props hold, as
 * `[data-grid-span="2"]` reads `data-grid-span` from the child's props.
 */
export const placementFor = (
  styled: Readonly<Record<string, Slotted>>,
  child: unknown,
): Placing | undefined => {
  const element = isValidElement(child) ? (child as ReactElement<Record<string, unknown>>) : null
  const props = element?.props ?? {}
  const tag = (element?.type as { readonly tag?: unknown } | undefined)?.tag
  let placed: Placing | undefined
  for (const [selector, given] of Object.entries(styled)) {
    if (
      given.placement !== undefined &&
      (selector === '*' || selector === tag || holds(selector, props))
    ) {
      placed = { ...placed, ...given.placement }
    }
  }
  return placed
}

/** A cell's alignment along a row, by the flex spelling of `align-items`. */
const ALONG: Readonly<Record<string, 'center' | 'flex-end' | 'flex-start' | 'stretch'>> = {
  center: 'center',
  end: 'flex-end',
  'flex-end': 'flex-end',
  'flex-start': 'flex-start',
  start: 'flex-start',
}

/** What a cell is to what it holds: a column, which stretches it across. */
const CELL: Layout = { flex: true, row: false, tracks: [] }

/** How a child is laid out: in a grid, in its cell, and elsewhere in `layout`. */
export const within = (form: GridForm | undefined, layout: Layout): Layout =>
  form === undefined ? layout : CELL

/** What a `::slotted()` rule gives a child where no rule names it. */
const NOTHING: Slotted = {
  counting: { increment: {}, reset: {}, set: {} },
  custom: {},
  style: {},
  values: {},
}

/**
 * What the host gives each child in a grid's cell: what its rules give it,
 * and, where the cells stretch down their row, a grow, so a Helix component
 * passed in is as tall as its row, as a grid item stretches on the web.
 */
export const celled = (
  styled: Readonly<Record<string, Slotted>>,
  form: GridForm | undefined,
): Readonly<Record<string, Slotted>> => {
  if (form === undefined || ALONG[form.alignItems ?? ''] !== undefined) {
    return styled
  }
  const out: Record<string, Slotted> = {}
  for (const [selector, given] of Object.entries({ '*': NOTHING, ...styled })) {
    out[selector] = { ...given, style: { flexGrow: 1, ...given.style } }
  }
  return out
}

/**
 * What a region draws for one child: the child, or in a grid, the child in a
 * cell that says where it goes.
 */
export const inCell = (
  form: GridForm | undefined,
  key: string,
  drawn: ReactNode,
  placed?: () => Placing | undefined,
): ReactNode => {
  if (form === undefined) {
    return drawn
  }
  const placement = placed?.()
  return (
    <GridCell key={key} {...(placement === undefined ? {} : { placement })}>
      {drawn}
    </GridCell>
  )
}

/**
 * A region's cells laid out on a grid's tracks, its lengths in rems at the
 * reader's whole text size and in ems at the size of the words around.
 */
export const gridded = (
  base: { readonly fontSize?: number; readonly rem?: number },
  key: string,
  form: GridForm,
  cells: readonly ReactNode[],
): ReactNode => {
  const rem = base.rem ?? 16
  return (
    <GridContent basis={{ em: base.fontSize ?? rem, rem }} form={form} key={key}>
      {cells}
    </GridContent>
  )
}

/**
 * How much narrower than its columns a cell is drawn, and how much short of
 * the line its row ends, in points: a view lays out in single precision, and
 * a row that came to a hair over the line would break before its last cell.
 */
const SLACK = 0.01

/** Where a cell's drawn right edge stands: a hair inside its columns. */
const rightOf = (cell: Cell): number => Math.floor((cell.x + cell.width - SLACK) * 100) / 100

/**
 * The style of one cell, where the grid has laid it out: its offset from
 * `start`, the drawn edge of the cell before it in its row, for the last of
 * its row the rest of the line to `end`, and the height or the least height
 * its row's track sets, which every cell of the row takes so the line is
 * that tall.
 */
const cellStyle = (
  cell: Cell,
  start: number,
  end: number | undefined,
  row: RowSize | undefined,
  measured: boolean,
) => ({
  marginStart: Math.max(0, cell.x - start),
  ...(measured ? {} : { width: Math.max(0, rightOf(cell) - cell.x) }),
  ...(end === undefined ? {} : { marginEnd: Math.max(0, end - rightOf(cell) - SLACK) }),
  ...(row?.height === undefined ? {} : { height: row.height }),
  ...(row?.least === undefined ? {} : { minHeight: row.least }),
})

/** The grid's content: its cells, laid out on its tracks at its width. */
export const GridContent = ({
  basis,
  children,
  form,
}: {
  readonly basis: Basis
  readonly children: readonly ReactNode[]
  readonly form: GridForm
}): ReactNode => {
  const [width, setWidth] = useState<number>()
  const [widths, setWidths] = useState<Readonly<Record<string, number>>>({})
  const measure = useCallback((event: LayoutChangeEvent) => {
    const laid = event.nativeEvent.layout.width
    setWidth((was) => (was === laid ? was : laid))
  }, [])
  const cells = Children.toArray(children)
  const keys = cells.map((cell, index) =>
    isValidElement(cell) && cell.key !== null ? String(cell.key) : String(index),
  )
  const columns = trackList(form.columns)
  const rows = form.rows === undefined ? undefined : trackList(form.rows)
  const laid =
    width === undefined || columns === undefined
      ? undefined
      : layout({
          basis,
          columnGap: form.columnGap,
          columns,
          items: cells.map((cell, index) => {
            const placed = isValidElement(cell) ? (cell.props as Marked).placement : undefined
            const own = widths[keys[index] ?? '']
            return {
              column: placementOf(placed?.column),
              row: placementOf(placed?.row),
              ...(own === undefined ? {} : { width: own }),
            }
          }),
          rowGap: form.rowGap,
          ...(rows === undefined ? {} : { rows }),
          width,
        })
  const measuring = new Set(laid?.measures ?? [])
  /* Each cell in the grid's order: by row, then by column. */
  const order = cells
    .map((_, at) => at)
    .sort((left, right) => {
      const [one, two] = [laid?.cells[left], laid?.cells[right]]
      return (one?.row ?? 0) - (two?.row ?? 0) || (one?.column ?? 0) - (two?.column ?? 0)
    })
  const styles = stylesOf(order, laid, width, measuring)
  const along = ALONG[form.alignItems ?? '']
  const down = along === undefined || along === 'stretch' ? 'flex-start' : along
  return (
    <View
      onLayout={measure}
      style={{
        alignContent: 'flex-start',
        alignItems: ALONG[form.alignItems ?? ''] ?? 'stretch',
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: form.rowGap,
      }}
    >
      {order.map((at, index) => {
        const key = keys[at] ?? String(at)
        const reports = (event: LayoutChangeEvent) => {
          const own = event.nativeEvent.layout.width
          setWidths((was) => (was[key] === own ? was : { ...was, [key]: own }))
        }
        return (
          <View
            key={key}
            {...(measuring.has(at) ? { onLayout: reports } : {})}
            style={{
              alignItems: ALONG[form.justifyItems ?? ''] ?? 'stretch',
              flexDirection: 'column',
              flexShrink: 0,
              /* A cell as tall as its row stands its content in it as
                 `align-items` says, at its start by default. */
              justifyContent: down,
              ...styles[index],
            }}
          >
            {cells[at]}
          </View>
        )
      })}
    </View>
  )
}

/**
 * Each cell's style, in the grid's order: one to a line until the grid is
 * laid out, and then where the layout places it.
 */
const stylesOf = (
  order: readonly number[],
  laid: Laid | undefined,
  width: number | undefined,
  measuring: ReadonlySet<number>,
): Readonly<Record<string, number | string>>[] => {
  let start = 0
  return order.map((at, index) => {
    const cell = laid?.cells[at]
    if (cell === undefined || width === undefined) {
      return { width: '100%' }
    }
    const next = laid?.cells[order[index + 1] ?? -1]
    const ends = next === undefined || next.row !== cell.row
    const style = cellStyle(
      cell,
      start,
      ends ? width : undefined,
      laid?.rows[cell.row],
      measuring.has(at),
    )
    start = ends ? 0 : rightOf(cell)
    return style
  })
}
