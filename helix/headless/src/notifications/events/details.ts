/*
 * What the notifications events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

/** Detail carried by `helix-before-read` and `helix-read`. */
export interface ReadDetail {
  /**
   * The state being asked for, as a boolean rather than a word that reads like
   * one, which is `helix-before-check`'s rule and for the same reason: `"false"` is
   * truthy and a consumer who forgets that marks everything read.
   */
  read: boolean
}
