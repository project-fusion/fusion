/** What the multiple selection reads of a row. */
export interface CheckableRow {
  /** Whether the row is a branch, holding rows of its own. */
  branch: boolean
  /** Whether the row is out of play. Its value is never added or taken away. */
  disabled: boolean
  /** The values of the leaves under a branch, in order. Empty for a leaf. */
  leaves: readonly string[]
  /** The row's own value. */
  value: string
}

/**
 * The values a branch stands for: its enabled leaves that have one, or its own
 * value where it holds none.
 */
const valuesOf = (row: CheckableRow): string[] =>
  row.branch && row.leaves.length > 0 ? [...row.leaves] : row.value === '' ? [] : [row.value]

/**
 * Whether a row is checked in a tree of check marks: a leaf by its value, and
 * a branch by its leaves, `mixed` where some of them are.
 */
export const checkedState = (row: CheckableRow, chosen: ReadonlySet<string>): boolean | 'mixed' => {
  const values = valuesOf(row)
  const count = values.filter((value) => chosen.has(value)).length
  if (count === 0) {
    return false
  }
  return count === values.length ? true : 'mixed'
}

/**
 * The checked values after a press on `row`, in `order`.
 *
 * A leaf comes in or out. A branch checks every leaf under it, or clears them
 * all where every one is already checked, as Ark UI's and Web Awesome's
 * checkbox trees do. A disabled row changes nothing.
 */
export const pressRow = (
  row: CheckableRow,
  chosen: readonly string[],
  order: readonly string[],
): string[] => {
  if (row.disabled) {
    return [...chosen]
  }
  const values = valuesOf(row)
  const all = values.every((value) => chosen.includes(value))
  const next = new Set(chosen)
  for (const value of values) {
    if (all) {
      next.delete(value)
    } else {
      next.add(value)
    }
  }
  return order.filter((value) => next.has(value))
}
