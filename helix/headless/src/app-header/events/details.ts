/*
 * What the app-header events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

/** Detail carried by `helix-scrolled`. */
export interface ScrolledDetail {
  /**
   * Whether the page is scrolled away from the top, as a boolean and not a word
   * that reads like one. Follows `helix-before-check`'s rule for the same reason.
   */
  scrolled: boolean
}
