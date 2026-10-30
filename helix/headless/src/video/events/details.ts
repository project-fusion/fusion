/*
 * What the video events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

/** Detail carried by `helix-next` and `helix-previous`. */
export interface SkipDetail {
  /** Which way the reader asked to go. */
  to: 'next' | 'previous'
}
