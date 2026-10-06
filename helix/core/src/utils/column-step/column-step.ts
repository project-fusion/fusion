/**
 * Where Up or Down moves in a list laid out in columns, as a grid of tiles or
 * a wrapping row is: to the next item after `at` (with `by` of `1`) or the
 * last one before it (`-1`) that starts at the same inline offset, which is
 * the item above or below it. `at` itself where there is none, so the key
 * stops at the edge, as React Aria's grid layout stops.
 *
 * Read from where the items are drawn rather than from a column count, so it
 * holds for a grid of any width, a row that wraps, and a column cut short.
 * `starts` are the items' inline offsets in the order of the list, such as
 * each one's `getBoundingClientRect().left`.
 */
export const columnStep = (starts: readonly number[], at: number, by: -1 | 1): number => {
  const column = starts[at]
  for (let index = at + by; index >= 0 && index < starts.length; index += by) {
    if (starts[index] === column) {
      return index
    }
  }
  return at
}
