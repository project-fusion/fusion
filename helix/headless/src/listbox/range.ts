/**
 * What Shift with Home or End adds to a listbox's selection, as arithmetic
 * over the options on show.
 *
 * Pure and beside the family's `index.ts`, because which options a range takes
 * in is a fact about a list, and a spec can hold it without a page.
 */

/**
 * The selection after Shift with Home or End: every option shown from the
 * highlight to the end the key went to, added after what was selected, or
 * `null` where nothing new is taken in.
 *
 * `from` is where the highlight was, as an index into `shown`, or `-1` for no
 * highlight, which takes in the end alone. `to` is the end the key went to.
 * APG's multiple-selection listbox.
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
