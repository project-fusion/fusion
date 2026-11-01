/*
 * What the Data Table events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

/** Detail carried by `helix-before-column-toggle` and `helix-column-toggle`. */
export interface ColumnToggleDetail {
  /** The `field` of the column. */
  field: string
  /** Whether the column is hidden after the change. */
  hidden: boolean
}

/** Detail carried by `helix-before-follow` and `helix-follow`. */
export interface FollowDetail {
  /** The path, query, and hash the link names, ready for a router. */
  href: string
}
