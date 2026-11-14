/**
 * What a virtual list reads of an item, on the web and on a phone: its key,
 * and the words typing matches.
 */
import { valueAt } from '../row-data/row-data.js'

/**
 * The text a value takes in a row.
 *
 * Nothing for a missing value, so a hole whose field is absent is empty and
 * does not read "undefined".
 */
export const textOf = (value: unknown): string =>
  value === undefined || value === null || typeof value === 'object' ? '' : String(value)

/**
 * The key of item `at` in a selecting list's `value`: its `keyField` where it
 * is an object and one is named, a string or a number item itself, and its
 * place in the set otherwise.
 */
export const keyOf = (item: unknown, at: number, keyField: string): string => {
  if (keyField !== '' && item !== null && typeof item === 'object') {
    return textOf(valueAt(item, keyField))
  }
  return typeof item === 'string' || typeof item === 'number' ? String(item) : String(at)
}

/**
 * The text typing matches for each item: its `field`, or a string or number
 * item itself, and nothing where an object has no `field` to read.
 */
export const textsOf = (data: readonly unknown[], field: string): string[] =>
  data.map((item) =>
    field === '' || item === null || typeof item !== 'object'
      ? textOf(item)
      : textOf(valueAt(item, field)),
  )
