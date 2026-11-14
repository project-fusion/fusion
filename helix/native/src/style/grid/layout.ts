/**
 * A grid's layout as numbers: the track list read, each cell placed, and each
 * column sized against the width the grid is laid out at.
 *
 * **A phone has flexbox and no grid**, so the renderer draws a grid as rows
 * of views, each cell as wide as the columns it spans and placed by its
 * offset. This works out those widths and offsets, as CSS grid does for the
 * part of it Grid's API reaches:
 *
 * - Column and row tracks: lengths in `px`, `rem`, `em`, and `%`, `calc()`,
 *   `min()`, `max()`, and `clamp()` over them, `fr`, `auto`, `minmax()`, and
 *   `repeat()`, with `auto-fill` and `auto-fit` against the width.
 * - Gaps between columns and between rows.
 * - Auto placement in row order, as `grid-auto-flow: row` places, with spans,
 *   and a line or a span written for a cell, as `1 / -1` and `span 2` are.
 *
 * **What it leaves out, and what a phone draws instead:**
 *
 * - Column flow and dense packing: each cell is placed in row order.
 * - Named areas and lines: a cell named for an area is placed in row order.
 * - Subgrids: a subgrid is a track of its own, sized by its content.
 * - A row track's height in `fr` or `%`: the row is as tall as its tallest
 *   cell, as a row sized `auto` is, and at least its least where a length
 *   sets that, as `minmax(30rem, 1fr)` does.
 * - A content-sized track's least width: `auto` and `minmax(auto, …)` start
 *   at nothing and grow to their cells' widest content, measured, where the
 *   web starts at the narrowest the content can wrap to.
 */
import type { Basis } from './lengths'
import { type Placed, place } from './place'
import { expanded, type RowSize, rowSizes, sized } from './size'
import { AUTO, type Placement, type Track, type TrackList } from './tracks'

export type { Basis } from './lengths'
export { lengthOf } from './lengths'
export type { RowSize } from './size'
export { placementOf, type Track, type TrackList, trackList } from './tracks'

/** A cell to lay out. */
export interface Item {
  readonly column?: Placement
  readonly row?: Placement
  /** Its content's widest, measured, which a track sized by its content reads. */
  readonly width?: number
}

/** What a grid is laid out from. */
export interface Input {
  readonly basis: Basis
  readonly columnGap: number
  readonly columns: TrackList
  readonly items: readonly Item[]
  readonly rowGap: number
  readonly rows?: TrackList
  /** The width the grid's content is laid out at, in points. */
  readonly width: number
}

/** Where a cell landed, by track from zero, and how wide it is and where it starts. */
export interface Cell {
  readonly column: number
  readonly columns: number
  readonly row: number
  readonly width: number
  readonly x: number
}

/** A grid laid out. */
export interface Layout {
  /** Each cell, in the order the items were given. */
  readonly cells: readonly Cell[]
  /** Each column track's width, explicit ones then any the cells added. */
  readonly columns: readonly number[]
  /**
   * The cells whose content's width a track sized by its content reads and
   * that has not been measured yet.
   */
  readonly measures: readonly number[]
  /** Each row's height or least height where a length sets it, and nothing where its tallest cell does. */
  readonly rows: readonly RowSize[]
}

/** Whether each track is an `auto-fit` one no cell reaches, which collapses. */
const collapsing = (
  fits: readonly boolean[],
  count: number,
  placed: readonly Placed[],
): boolean[] => {
  const reached = new Set(
    placed.flatMap((cell) => Array.from({ length: cell.columns }, (_, at) => cell.column + at)),
  )
  return Array.from({ length: count }, (_, index) => fits[index] === true && !reached.has(index))
}

/**
 * How wide each track sized by its content is: the widest cell that sits in
 * it alone. Each such cell not yet measured is named in `measures`.
 */
const contentsOf = (
  tracks: readonly Track[],
  placed: readonly Placed[],
  items: readonly Item[],
): { readonly contents: number[]; readonly measures: number[] } => {
  const contents = tracks.map(() => 0)
  const measures: number[] = []
  placed.forEach((cell, index) => {
    if (cell.columns !== 1 || tracks[cell.column]?.max.kind !== 'auto') {
      return
    }
    const measured = items[index]?.width
    if (measured === undefined) {
      measures.push(index)
      return
    }
    contents[cell.column] = Math.max(contents[cell.column] ?? 0, measured)
  })
  return { contents, measures }
}

/** Each track's start, with a gap before every shown track after the first. */
const startsOf = (
  sizes: readonly number[],
  collapsed: readonly boolean[],
  gap: number,
): number[] => {
  const starts: number[] = []
  let cursor = 0
  let shown = false
  sizes.forEach((size, index) => {
    cursor += !collapsed[index] && shown ? gap : 0
    starts.push(cursor)
    cursor += size
    shown ||= !collapsed[index]
  })
  return starts
}

/** Lays a grid out at its width. */
export const layout = (input: Input): Layout => {
  const { basis, columnGap, width } = input
  const columnList = expanded(input.columns, width, columnGap, basis)
  const explicitRows =
    input.rows === undefined ? 0 : expanded(input.rows, 0, input.rowGap, basis).tracks.length
  const { columns, placed } = place(input.items, columnList.tracks.length, explicitRows)
  const tracks: Track[] = [...columnList.tracks]
  while (tracks.length < columns) {
    tracks.push({ max: AUTO, min: AUTO })
  }
  const collapsed = collapsing(columnList.fits, tracks.length, placed)
  const { contents, measures } = contentsOf(tracks, placed, input.items)
  const sizes = sized(tracks, collapsed, contents, width, columnGap, basis)
  const starts = startsOf(sizes, collapsed, columnGap)
  const cells = placed.map((cell) => {
    const last = cell.column + cell.columns - 1
    const x = starts[cell.column] ?? 0
    const end = (starts[last] ?? 0) + (sizes[last] ?? 0)
    return {
      column: cell.column,
      columns: cell.columns,
      row: cell.row,
      width: Math.max(0, end - x),
      x,
    }
  })
  const rows = Math.max(explicitRows, ...placed.map((cell) => cell.row + cell.rows))
  return { cells, columns: sizes, measures, rows: rowSizes(input.rows, rows, input.rowGap, basis) }
}
