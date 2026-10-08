/**
 * The arithmetic of a rectangle of cells on a heatmap's strip.
 *
 * Pure and beside the family's entry, so a spec holds it without a page. The
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
export const rectangleOf = (count: number, rows: number, from: number, to: number): number[] => {
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
export const inSequence = (picked: readonly string[], order: readonly string[]): string[] => {
  const at = (key: string): number => {
    const place = order.indexOf(key)
    return place < 0 ? order.length : place
  }
  return [...new Set(picked)].sort((a, b) => at(a) - at(b))
}
