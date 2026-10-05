/**
 * The names in a Legend's `hidden-series`, and what a toggle leaves there.
 *
 * Pure and beside the family's `index.ts`, because what a press does to the
 * list is a fact about lists and not about the legend's template.
 */

/**
 * The names in a `hidden-series` list.
 *
 * **Commas only**, because a column's heading may hold a space: split on
 * whitespace, `Direct sales` would hide a series called `Direct` and one
 * called `sales`. This is the value rule `writtenList` describes, and not its
 * own.
 */
export const hiddenNames = (list: string): string[] =>
  list
    .split(',')
    .map((one) => one.trim())
    .filter((one) => one !== '')

/** Whether a name is in the list, matched without regard to case, as a heading is. */
export const isHidden = (list: string, name: string): boolean => {
  const key = name.trim().toLowerCase()
  return hiddenNames(list).some((one) => one.toLowerCase() === key)
}

/**
 * The list a press on this name leaves: without it where it was hidden, and
 * with it at the end where it was shown. Written back with a comma and a
 * space, as a person writes a list.
 */
export const toggledNames = (list: string, name: string): string => {
  const key = name.trim().toLowerCase()
  const now = hiddenNames(list)
  const next = isHidden(list, name)
    ? now.filter((one) => one.toLowerCase() !== key)
    : [...now, name.trim()]
  return next.join(', ')
}
