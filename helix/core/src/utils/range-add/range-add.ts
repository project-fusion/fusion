/**
 * What a range adds to a selection of many, as arithmetic over the items on
 * show.
 *
 * Pure and in core, because Listbox (Shift with Home or End) and Data Table
 * (Shift with an arrow, Home or End, over rows) take in a range the same way,
 * and a spec can hold it without a page.
 */

/**
 * The selection after Shift with Home or End: every option shown from the
 * highlight to the end the key went to, added after what was selected, or
 * `null` where nothing new is taken in.
 *
 * `from` is where the highlight was, as an index into `shown`, or `-1` for no
 * highlight, which takes in the end alone. `to` is the end the key went to.
 * APG's multiple-selection listbox, and the same rule over a data table's
 * rows.
 */
export const rangeAdd = (
  values: readonly string[],
  shown: readonly string[],
  from: number,
  to: number,
): string[] | null => {
  const [start, end] = from < 0 ? [to, to] : [Math.min(from, to), Math.max(from, to)]
  const added = shown.slice(start, end + 1).filter((value) => !values.includes(value))
  return added.length > 0 ? [...values, ...added] : null
}
