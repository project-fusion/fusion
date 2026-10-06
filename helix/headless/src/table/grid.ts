/**
 * Where a key moves focus in a table read as a grid, as arithmetic over places.
 *
 * Pure and beside the family's `index.ts`, so a spec holds the keyboard map
 * without a page. The table finds the cells and focuses them; this says which
 * place a key reaches from which.
 */

/**
 * A cell's place in the grid. The row of headings is row `-1`, the rows count
 * from 0 in the order they are drawn, and a `selectable` table's checkbox
 * column is column 0.
 */
export interface GridPlace {
  column: number
  row: number
}

/** The edges of the grid a key cannot move past. */
export interface GridBounds {
  /** The last row, counted as `GridPlace.row` counts. */
  last: number
  /** The first row: `-1` where there is a row of headings, and `0` where there is not. */
  top: number
  /** How many columns the grid has. */
  width: number
}

/** What a key reads besides itself. */
export interface GridKeys {
  /** Whether Control or Command was held, which takes Home and End to the corners. */
  control: boolean
  /** How many rows Page Up and Page Down move. */
  page: number
  /**
   * Which way a horizontal arrow moves along the line: `1` forward, `-1` back,
   * as core `inlineStep` answers, so a right-to-left page is already flipped.
   */
  step: -1 | 0 | 1
}

const within = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(high, value))

/**
 * The place a key reaches from `from`, or `undefined` for a key that does not
 * move focus. A key at an edge answers the place it is on, so the caller still
 * takes the key.
 *
 * | Key | Place |
 * |---|---|
 * | Up, Down | One row, the headings included. |
 * | Left, Right | One column along the line, as `step` says. |
 * | Home, End | The first or the last column of the row. |
 * | Control with Home or End | The first column of the first row, or the last of the last. |
 * | Page Up, Page Down | `page` rows. |
 */
export const gridMove = (
  key: string,
  from: GridPlace,
  bounds: GridBounds,
  keys: GridKeys,
): GridPlace | undefined => {
  const { last, top, width } = bounds
  const edge = Math.max(0, width - 1)
  const row = (to: number): GridPlace => ({ column: from.column, row: within(to, top, last) })
  switch (key) {
    case 'ArrowUp':
      return row(from.row - 1)
    case 'ArrowDown':
      return row(from.row + 1)
    case 'ArrowLeft':
    case 'ArrowRight':
      return keys.step === 0
        ? undefined
        : { column: within(from.column + keys.step, 0, edge), row: from.row }
    case 'Home':
      return { column: 0, row: keys.control ? top : from.row }
    case 'End':
      return { column: edge, row: keys.control ? last : from.row }
    case 'PageUp':
      return row(from.row - keys.page)
    case 'PageDown':
      return row(from.row + keys.page)
    default:
      return undefined
  }
}

/**
 * How many rows Page Up and Page Down move: the rows of `tall` pixels that fit
 * in `room`, less one, so the row focus left stays in view. At least one.
 */
export const pageRows = (room: number, tall: number): number =>
  tall > 0 ? Math.max(1, Math.floor(room / tall) - 1) : 1
