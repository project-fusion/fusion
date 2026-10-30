/*
 * What the virtual-list events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

/** Detail carried by `helix-range-change`. */
export interface RangeDetail {
  /** The index of the first item on screen. */
  first: number
  /** One past the index of the last item on screen. */
  last: number
}
