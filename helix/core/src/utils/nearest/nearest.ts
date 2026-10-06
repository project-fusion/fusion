/**
 * The value in `values` nearest `target`, the first of two at the same
 * distance, or `undefined` for none.
 *
 * Drawer's `snapTo` and Rating's reading of a score between its steps each
 * wrote this loop. Given in ascending order, a target halfway between two
 * goes to the lower, which is the rule both kept.
 */
export const nearest = (values: Iterable<number>, target: number): number | undefined => {
  let found: number | undefined
  for (const one of values) {
    if (found === undefined || Math.abs(one - target) < Math.abs(found - target)) {
      found = one
    }
  }
  return found
}
