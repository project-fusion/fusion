/** What a tree row is, for the arrow along the line. */
export interface TreeArrowRow {
  /** Whether the row holds rows of its own. */
  branch: boolean
  /** Whether a disabled branch, which neither opens nor shuts. */
  disabled?: boolean
  /** Whether the branch is open. */
  open: boolean
}

/** What the arrow along the line does on a row. */
export type TreeArrow = 'child' | 'close' | 'open' | 'parent'

/**
 * What Right or Left does on a tree row, as the APG tree view says: `along` is
 * `1` for the key that points into a branch, where its caret points (Right on
 * a left-to-right page), and `-1` for the other.
 *
 * In: a shut branch opens, and an open one moves to its first child; a leaf
 * does nothing (`undefined`). Out: an open branch shuts, and anything else
 * moves to its parent. A disabled branch neither opens nor shuts. Tree, Object
 * Inspector and Data Table's tree column read their keys through this, and
 * Data Table takes `child` and `undefined` as the next column.
 */
export const treeArrow = (row: TreeArrowRow, along: -1 | 1): TreeArrow | undefined => {
  if (along === 1) {
    if (row.branch && !row.open && !row.disabled) {
      return 'open'
    }
    return row.branch ? 'child' : undefined
  }
  return row.branch && row.open && !row.disabled ? 'close' : 'parent'
}
