/*
 * What the Data Table events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

/** Detail carried by `helix-before-follow` and `helix-follow`. */
export interface FollowDetail {
  /** The path, query, and hash the link names, ready for a router. */
  href: string
}
