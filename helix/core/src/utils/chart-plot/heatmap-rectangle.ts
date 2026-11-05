/**
 * The arithmetic of the cells on a heatmap's strip: where each stands, and
 * the rectangle of them a selection takes in.
 *
 * Pure and in core, so the web's element and a phone's place and select the
 * same cells, and a spec holds it without a page. The
 * strip fills `rows` cells down each column and then across, so cell `i` is in
 * column `floor(i / rows)` and row `i % rows`, on every page: a right-to-left
 * page turns the drawing about, and a rectangle between two cells takes in the
 * same cells whichever way the columns run.
 */

/** Whether `value` lies between `a` and `b`, either way round. */
const within = (value: number, a: number, b: number): boolean => (value - a) * (value - b) <= 0

/**
 * The cells between `from` and `to` by row and by column, in the order the
 * cells are drawn: every cell whose column lies between theirs and whose row
 * lies between theirs. A place past the end of a short last column holds no
 * cell and is skipped. With one row, it is the run of cells from one to the
 * other.
 */
export const heatmapRectangle = (
  count: number,
  rows: number,
  from: number,
  to: number,
): number[] => {
  const taken: number[] = []
  for (let at = 0; at < count; at += 1) {
    if (
      within(Math.floor(at / rows), Math.floor(from / rows), Math.floor(to / rows)) &&
      within(at % rows, from % rows, to % rows)
    ) {
      taken.push(at)
    }
  }
  return taken
}

/**
 * `picked` without repeats, in the order `order` gives: the selected cells in
 * the order the table lists them. A value `order` does not hold keeps its
 * place after the rest, so a selected day the strip no longer draws stays
 * selected.
 */
export const heatmapInSequence = (
  picked: readonly string[],
  order: readonly string[],
): string[] => {
  const at = (key: string): number => {
    const place = order.indexOf(key)
    return place < 0 ? order.length : place
  }
  return [...new Set(picked)].sort((a, b) => at(a) - at(b))
}

/**
 * Where the cell at `at` stands on the strip, in pixels from its start
 * corner: its column across and its row down, `cell` wide and `height` tall
 * with `gap` between. The web hangs its bubble off this place, and a phone
 * stands each cell at it.
 */
export const heatmapCellBox = (
  at: number,
  rows: number,
  cell: number,
  gap: number,
  height = cell,
): { readonly x: number; readonly y: number } => ({
  x: Math.floor(at / rows) * (cell + gap),
  y: (at % rows) * (height + gap),
})

/** What a rectangle taken in with Shift reads: the strip's days, and where it starts and ends. */
export interface HeatmapStretch {
  /** The name of every row of the table, oldest first, as `value` writes them. */
  readonly all: readonly string[]
  /** The cells to a column. */
  readonly rows: number
  /** The row of the table the rectangle starts from. */
  readonly anchor: number
  /** How many of the oldest rows a narrow strip leaves undrawn. */
  readonly dropped: number
  /** The drawn cell the rectangle ends at. */
  readonly to: number
  /** What was selected before the rectangle started, less its anchor. */
  readonly base: readonly string[]
}

/**
 * The selection a rectangle leaves: what was selected before it beside the
 * days between its corners, in the table's order. The corners are counted
 * over every row, shifted so the columns fall where the strip draws them,
 * since a narrow strip drops whole columns, so an anchor in a column no
 * longer drawn still takes in its corner.
 */
export const heatmapStretch = (stretch: HeatmapStretch): string[] => {
  const { all, anchor, base, dropped, rows, to } = stretch
  const shift = (rows - (dropped % rows)) % rows
  const taken = heatmapRectangle(all.length + shift, rows, anchor + shift, dropped + to + shift)
    .filter((at) => at >= shift)
    .map((at) => all[at - shift] ?? '')
  return heatmapInSequence([...base, ...taken].filter(Boolean), all)
}
