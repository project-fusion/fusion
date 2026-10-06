/**
 * The row keys a data table holds in `selected` and `expanded`, as arithmetic
 * over comma-separated lists.
 *
 * Pure and beside the family's `index.ts`, so a spec holds the rules without a
 * page: which rows a toggle leaves open. The order a list of keys is written
 * in and where a Shift range runs from are core's `inRowOrder` and `anchorAt`.
 */
import { commaList, inRowOrder } from '@fusion.dev/helix-core'

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
