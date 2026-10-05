/**
 * The row keys a data table holds in `selected` and `expanded`, as arithmetic
 * over comma-separated lists.
 *
 * Pure and beside the family's `index.ts`, so a spec holds the rules without a
 * page: the order a list of keys is written in, which rows a toggle leaves
 * open, and where a Shift range runs from.
 */
import { commaList } from '@fusion.dev/helix-core'

/**
 * `keys` in the order the rows are, which is `order`: the keys of the whole
 * result. A key the result does not hold, a selected row a search has hidden
 * say, keeps its place after them in the order it was given.
 *
 * So `selected` and `expanded`, and the events that carry them, read in row
 * order whatever order the rows were chosen in.
 */
export const inRowOrder = (keys: Iterable<string>, order: readonly string[]): string[] => {
  const wanted = new Set(keys)
  const placed = order.filter((key) => wanted.has(key))
  const seen = new Set(placed)
  return [...placed, ...[...wanted].filter((key) => !seen.has(key))]
}

/**
 * The `expanded` a toggle of row `key` leaves, in row order, or `undefined`
 * where the row is open or closed already. Keys are split on commas only, so a
 * key may hold a space.
 */
export const toggledOpen = (
  expanded: string,
  key: string,
  open: boolean,
  order: readonly string[],
): string | undefined => {
  const keys = new Set(commaList(expanded))
  if (keys.has(key) === open) {
    return undefined
  }
  if (open) {
    keys.add(key)
  } else {
    keys.delete(key)
  }
  return inRowOrder(keys, order).join(',')
}

/**
 * Where a Shift range runs from, as an index into the page's `keys`: the row
 * last chosen while it is on the page, and otherwise the row the reader is on,
 * `from`, which becomes the one to run from.
 */
export const anchorAt = (
  keys: readonly string[],
  anchorKey: string | undefined,
  from: number,
): { anchor: number; anchorKey: string | undefined } => {
  const anchor = anchorKey === undefined ? -1 : keys.indexOf(anchorKey)
  return anchor < 0 ? { anchor: from, anchorKey: keys[from] } : { anchor, anchorKey }
}
