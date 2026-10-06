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

/** A list as it may be given: names separated by commas, or an array of names. */
export type NameList = string | readonly string[]

/**
 * The names in a list, written either way: split on commas from a string,
 * trimmed and without blanks from an array, which is what a framework hands
 * over for `hiddenSeries={['Direct']}`.
 */
export const namesIn = (list: NameList): string[] =>
  typeof list === 'string'
    ? commaList(list)
    : list.map((name) => String(name).trim()).filter((name) => name !== '')

/** Whether a name is in the list, matched without regard to case, as a heading is. */
export const isHidden = (list: NameList, name: string): boolean => {
  const key = seriesKey(name)
  return namesIn(list).some((one) => seriesKey(one) === key)
}

/**
 * The list a press on this name leaves: without it where it was hidden, and
 * with it at the end where it was shown. Written back with a comma and a
 * space, as a person writes a list.
 */
export const toggledNames = (list: NameList, name: string): string => {
  const key = seriesKey(name)
  const now = namesIn(list)
  const next = isHidden(list, name)
    ? now.filter((one) => seriesKey(one) !== key)
    : [...now, name.trim()]
  return next.join(', ')
}
