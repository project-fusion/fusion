import { commaList, seriesKey } from '@fusion.dev/helix-core'

/*
 * The names in a Legend's `hidden-series`, and what a toggle leaves there.
 *
 * Pure and beside the family's `index.ts`, because what a press does to the
 * list is a fact about lists and not about the legend's template.
 *
 * **Commas only**, through `commaList`, because a column's heading may hold a
 * space: split on whitespace, `Direct sales` would hide a series called
 * `Direct` and one called `sales`.
 */

/** Whether a name is in the list, matched without regard to case, as a heading is. */
export const isHidden = (list: string, name: string): boolean => {
  const key = seriesKey(name)
  return commaList(list).some((one) => seriesKey(one) === key)
}

/**
 * The list a press on this name leaves: without it where it was hidden, and
 * with it at the end where it was shown. Written back with a comma and a
 * space, as a person writes a list.
 */
export const toggledNames = (list: string, name: string): string => {
  const key = seriesKey(name)
  const now = commaList(list)
  const next = isHidden(list, name)
    ? now.filter((one) => seriesKey(one) !== key)
    : [...now, name.trim()]
  return next.join(', ')
}
