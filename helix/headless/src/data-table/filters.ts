/**
 * A Data Table's filters: the comparisons each column type offers, whether a
 * value or a row passes them, and the values an enum column holds.
 *
 * String handling and comparisons with no DOM in them, so the pure spec covers
 * it directly. `view.ts` exports all of it with the view it filters.
 */

import type { ColumnType } from '../table/column-type.js'
import type { ViewFilter } from './view.js'

/** One comparison a column's filter offers. */
export interface FilterOperatorInfo {
  /** How many values it takes. */
  arity: 'many' | 'none' | 'one' | 'two'
  /** The words a reader is shown, in English. */
  label: string
  /** Its name in a view. */
  name: string
}

const OPERATORS: Record<ColumnType, readonly FilterOperatorInfo[]> = {
  boolean: [{ arity: 'one', label: 'is', name: 'is' }],
  date: [
    { arity: 'one', label: 'on', name: 'on' },
    { arity: 'one', label: 'before', name: 'before' },
    { arity: 'one', label: 'after', name: 'after' },
    { arity: 'two', label: 'between', name: 'between' },
    { arity: 'none', label: 'is empty', name: 'empty' },
  ],
  enum: [
    { arity: 'many', label: 'is any of', name: 'any' },
    { arity: 'many', label: 'is none of', name: 'none' },
    { arity: 'none', label: 'is empty', name: 'empty' },
  ],
  number: [
    { arity: 'one', label: '=', name: 'eq' },
    { arity: 'one', label: '≠', name: 'ne' },
    { arity: 'one', label: '<', name: 'lt' },
    { arity: 'one', label: '≤', name: 'le' },
    { arity: 'one', label: '>', name: 'gt' },
    { arity: 'one', label: '≥', name: 'ge' },
    { arity: 'two', label: 'between', name: 'between' },
    { arity: 'none', label: 'is empty', name: 'empty' },
  ],
  text: [
    { arity: 'many', label: 'contains', name: 'contains' },
    { arity: 'many', label: 'is', name: 'is' },
    { arity: 'many', label: 'is not', name: 'not' },
    { arity: 'none', label: 'is empty', name: 'empty' },
  ],
}

/** The comparisons a column of a type offers, its default first. */
export const operatorsFor = (type: ColumnType): readonly FilterOperatorInfo[] => OPERATORS[type]

const empty = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '')

const dayOf = (value: unknown): number | undefined => {
  if (empty(value)) {
    return undefined
  }
  const time =
    value instanceof Date
      ? value.getTime()
      : typeof value === 'number'
        ? value
        : Date.parse(String(value))
  return Number.isNaN(time) ? undefined : Math.floor(time / 86_400_000)
}

const numberOf = (value: unknown): number | undefined => {
  if (empty(value)) {
    return undefined
  }
  const number = typeof value === 'number' ? value : Number(String(value).replaceAll(',', ''))
  return Number.isNaN(number) ? undefined : number
}

/** The text a value is compared as, for text and enum columns. */
export const textOf = (value: unknown): string =>
  value === undefined || value === null
    ? ''
    : value instanceof Date
      ? value.toISOString()
      : String(value)

const fold = (text: string): string =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase()

/** Whether one value passes one filter, compared as its column's type. */
export const passes = (value: unknown, type: ColumnType, filter: ViewFilter): boolean => {
  const { operator, values } = filter
  if (operator === 'empty') {
    return empty(value)
  }
  if (type === 'number' || type === 'date') {
    const read = type === 'number' ? numberOf : dayOf
    const it = read(value)
    const [a, b] = values.map(read)
    if (a === undefined || (operator === 'between' && b === undefined)) {
      return true
    }
    if (it === undefined) {
      return operator === 'ne'
    }
    switch (operator) {
      case 'eq':
      case 'on':
        return it === a
      case 'ne':
        return it !== a
      case 'lt':
      case 'before':
        return it < a
      case 'le':
        return it <= a
      case 'gt':
      case 'after':
        return it > a
      case 'ge':
        return it >= a
      case 'between':
        return it >= Math.min(a, b as number) && it <= Math.max(a, b as number)
      default:
        return true
    }
  }
  if (type === 'boolean') {
    const [wanted] = values
    return wanted === undefined || String(Boolean(value) && value !== 'false') === wanted
  }
  if (values.length === 0) {
    return true
  }
  const text = fold(textOf(value))
  const folded = values.map(fold)
  switch (operator) {
    case 'contains':
      return folded.some((one) => text.includes(one))
    case 'none':
    case 'not':
      return !folded.includes(text)
    default:
      return folded.includes(text)
  }
}

/** What the filters need of a column: how to read a row and what it holds. */
export interface FilterColumn {
  field: string
  type: ColumnType
  value: (row: Readonly<Record<string, unknown>>) => unknown
}

/**
 * Whether a row passes every filter. Filters on different columns all have to
 * match, and a filter's own values are any of, so `status: open, pending` and
 * `owner: ada` is open or pending, and Ada's. A filter on a field no column
 * declares is left out, so a stored view outlives a removed column.
 */
export const passesAll = (
  row: Readonly<Record<string, unknown>>,
  filters: readonly ViewFilter[],
  columns: ReadonlyMap<string, FilterColumn>,
): boolean =>
  filters.every((filter) => {
    const column = columns.get(filter.field)
    return !column || passes(column.value(row), column.type, filter)
  })

/** One value an enum column holds, and how many rows hold it. */
export interface Facet {
  count: number
  value: string
}

/** Every value a column holds across the rows, with how many rows hold each, most first. */
export const facetsOf = (
  rows: readonly Readonly<Record<string, unknown>>[],
  value: (row: Readonly<Record<string, unknown>>) => unknown,
): Facet[] => {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const text = textOf(value(row))
    if (text !== '') {
      counts.set(text, (counts.get(text) ?? 0) + 1)
    }
  }
  return [...counts]
    .map(([one, count]) => ({ count, value: one }))
    .sort((a, b) => b.count - a.count || (a.value < b.value ? -1 : a.value > b.value ? 1 : 0))
}
