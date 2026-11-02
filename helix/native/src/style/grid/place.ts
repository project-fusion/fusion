/**
 * Where each cell of a grid goes, by CSS's auto-placement in row order: a
 * cell set on both axes where it is set, then one set on its row, then the
 * rest from a cursor that only moves forward, so a cell that does not fit
 * starts the next row and leaves a hole behind it, as `grid-auto-flow: row`
 * places. Dense packing and column flow are the web's.
 */
import type { Placement } from './tracks'

/** A cell placed: its first row and column, from zero, and how many of each it spans. */
export interface Placed {
  readonly column: number
  readonly columns: number
  readonly row: number
  readonly rows: number
}

/** One axis of a placement resolved: its first track, where it is set, and its span. */
interface Side {
  readonly at?: number
  readonly span: number
}

/** A line as a track from zero, a negative line counted back from the explicit grid's end. */
const lineAt = (line: number, explicit: number): number =>
  Math.max(0, line > 0 ? line - 1 : explicit + 1 + line)

/** A placement along an axis of `explicit` tracks. */
const sideOf = (placement: Placement | undefined, explicit: number): Side => {
  const { end, span, start } = placement ?? {}
  if (start !== undefined && end !== undefined) {
    const [from, to] = [lineAt(start, explicit), lineAt(end, explicit)]
    return { at: from, span: to > from ? to - from : 1 }
  }
  if (start !== undefined) {
    return { at: lineAt(start, explicit), span: span ?? 1 }
  }
  if (end !== undefined) {
    const across = span ?? 1
    return { at: Math.max(0, lineAt(end, explicit) - across), span: across }
  }
  return { span: span ?? 1 }
}

/** Which cells are taken, by row, each row a set of columns. */
class Taken {
  private readonly rows: Set<number>[] = []

  constructor(private readonly columns: number) {}

  /** Whether `span` columns from `column` in `row` are inside the grid and free. */
  fits(row: number, column: number, span: number): boolean {
    if (column + span > this.columns) {
      return false
    }
    const taken = this.rows[row]
    return !Array.from({ length: span }, (_, at) => column + at).some((at) => taken?.has(at))
  }

  take(cell: Placed): void {
    for (let row = cell.row; row < cell.row + cell.rows; row += 1) {
      const taken = this.rows[row] ?? new Set<number>()
      this.rows[row] = taken
      for (let at = cell.column; at < cell.column + cell.columns; at += 1) {
        taken.add(at)
      }
    }
  }
}

/** The cursor auto-placement moves forward. */
interface Cursor {
  column: number
  row: number
}

/** Places a cell set on its column, at the first row from the cursor where it fits. */
const atColumn = (taken: Taken, cursor: Cursor, column: number, span: number): void => {
  if (column < cursor.column) {
    cursor.row += 1
  }
  cursor.column = column
  while (!taken.fits(cursor.row, column, span)) {
    cursor.row += 1
  }
}

/** Moves the cursor forward to the first place a cell of `span` fits, onto later rows as it must. */
const forward = (taken: Taken, cursor: Cursor, span: number, columns: number): void => {
  while (!taken.fits(cursor.row, cursor.column, span)) {
    cursor.column += 1
    if (cursor.column + span > columns) {
      cursor.row += 1
      cursor.column = 0
    }
  }
}

/** Places a cell set on its row, at the first column where it fits. */
const atRow = (taken: Taken, row: number, span: number, columns: number): number => {
  let column = 0
  while (column < columns && !taken.fits(row, column, span)) {
    column += 1
  }
  return Math.min(column, Math.max(0, columns - span))
}

/**
 * Each cell's place, in the order the cells were given, and how many columns
 * the grid has with any a cell added beyond `explicitColumns`.
 */
export const place = (
  items: readonly { readonly column?: Placement; readonly row?: Placement }[],
  explicitColumns: number,
  explicitRows: number,
): { readonly columns: number; readonly placed: readonly Placed[] } => {
  const sides = items.map((item) => ({
    column: sideOf(item.column, explicitColumns),
    row: sideOf(item.row, explicitRows),
  }))
  const columns = Math.max(
    explicitColumns,
    ...sides.map(({ column }) => (column.at ?? 0) + column.span),
  )
  const taken = new Taken(columns)
  const placed: Placed[] = []
  const put = (index: number, cell: Placed) => {
    placed[index] = cell
    taken.take(cell)
  }
  sides.forEach(({ column, row }, index) => {
    if (column.at !== undefined && row.at !== undefined) {
      put(index, { column: column.at, columns: column.span, row: row.at, rows: row.span })
    }
  })
  sides.forEach(({ column, row }, index) => {
    if (column.at === undefined && row.at !== undefined) {
      const at = atRow(taken, row.at, column.span, columns)
      put(index, { column: at, columns: column.span, row: row.at, rows: row.span })
    }
  })
  const cursor: Cursor = { column: 0, row: 0 }
  sides.forEach(({ column, row }, index) => {
    if (row.at !== undefined) {
      return
    }
    if (column.at === undefined) {
      forward(taken, cursor, column.span, columns)
    } else {
      atColumn(taken, cursor, column.at, column.span)
    }
    put(index, { column: cursor.column, columns: column.span, row: cursor.row, rows: row.span })
  })
  return { columns, placed }
}
