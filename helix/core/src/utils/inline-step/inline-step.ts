/**
 * Which way along the line of text a horizontal arrow key moves.
 *
 * `1` for the key pointing where the line runs, `-1` for the one pointing back
 * to where it started, `0` for any other key. On a left-to-right page that is
 * `ArrowRight` and `ArrowLeft`; on a right-to-left page it is the other way
 * round, because a row of tabs, a toolbar or a week of days is laid out from
 * the right there and an arrow is a promise about where on screen focus goes.
 *
 * **The computed `direction`, not `:dir()` or the `dir` attribute.** The two
 * part only where a sheet sets `direction` without `dir`, and there the row is
 * laid out by `direction`: a flex row and a grid both follow it. What a reader
 * sees is the order the key has to agree with, and it is the question the
 * table's and the splitter's pointer arithmetic already ask.
 *
 * Asked at the press rather than once, so a page that changes `dir` is
 * answered in its new direction without anything having to watch it.
 *
 * Up and down are not asked about: a block runs down the page in every script
 * here, so a vertical key means the same thing whichever way the line runs.
 */
export const inlineStep = (element: Element, key: string): -1 | 0 | 1 => {
  if (key !== 'ArrowLeft' && key !== 'ArrowRight') {
    return 0
  }
  const rtl = getComputedStyle(element).direction === 'rtl'
  return (key === 'ArrowRight') !== rtl ? 1 : -1
}
