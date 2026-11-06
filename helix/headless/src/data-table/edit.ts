/**
 * Editing a Data Table's cells: reading what a reader typed as the column's
 * type, checking it against the column's rules, and writing it into a row.
 *
 * No DOM in it, so the pure spec covers it directly. The table owns the keys,
 * the events and the drawing.
 */

import type { ColumnType } from '../table/column-type.js'

/** The rules a column sets on what its cells may hold. */
export interface EditRules {
  /** The largest value: a number, or a date as `YYYY-MM-DD`. */
  max?: string | undefined
  /** The smallest value. */
  min?: string | undefined
  /** A pattern a text value matches whole, as in an input's `pattern`. */
  pattern?: string | undefined
  /** Whether a cell may be left empty. */
  required?: boolean | undefined
}

/** Which rule a value broke, with what the words need. */
export type EditProblem =
  | { kind: 'max'; max: string }
  | { kind: 'min'; min: string }
  | { kind: 'number' }
  | { kind: 'pattern' }
  | { kind: 'required' }

const blank = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '')

/**
 * Reads what a reader typed as the column's type: a number for a number
 * column, `true` or `false` for a boolean, and text, a date as text, otherwise.
 * An empty number is `null`. Text that is not a number stays text, so the
 * check can say so.
 */
export const readEdit = (value: unknown, type: ColumnType): unknown => {
  if (type === 'number') {
    if (typeof value === 'number') {
      return value
    }
    if (blank(value)) {
      return null
    }
    const number = Number(String(value).replaceAll(',', ''))
    return Number.isNaN(number) ? String(value) : number
  }
  if (type === 'boolean') {
    return value === true || value === 'true'
  }
  return value === undefined || value === null ? '' : value
}

/** The first rule a value breaks, or nothing where it keeps them all. */
export const checkEdit = (
  value: unknown,
  type: ColumnType,
  rules: EditRules,
): EditProblem | undefined => {
  if (blank(value)) {
    return rules.required ? { kind: 'required' } : undefined
  }
  if (type === 'number') {
    if (typeof value !== 'number') {
      return { kind: 'number' }
    }
    if (rules.min !== undefined && rules.min !== '' && value < Number(rules.min)) {
      return { kind: 'min', min: rules.min }
    }
    if (rules.max !== undefined && rules.max !== '' && value > Number(rules.max)) {
      return { kind: 'max', max: rules.max }
    }
    return undefined
  }
  if (type === 'date') {
    const text = String(value)
    if (rules.min && text < rules.min) {
      return { kind: 'min', min: rules.min }
    }
    if (rules.max && text > rules.max) {
      return { kind: 'max', max: rules.max }
    }
    return undefined
  }
  if (rules.pattern && !new RegExp(`^(?:${rules.pattern})$`, 'v').test(String(value))) {
    return { kind: 'pattern' }
  }
  return undefined
}

/**
 * A copy of a row with one field set. A dot path sets a nested value, copying
 * each object on the way, so the row a page handed over is never changed.
 */
export const withValue = (
  row: Readonly<Record<string, unknown>>,
  field: string,
  value: unknown,
): Record<string, unknown> => {
  const [head, ...rest] = field.split('.')
  const key = head as string
  if (rest.length === 0) {
    return { ...row, [key]: value }
  }
  const inner = row[key]
  return {
    ...row,
    [key]: withValue(
      inner && typeof inner === 'object' ? (inner as Record<string, unknown>) : {},
      rest.join('.'),
      value,
    ),
  }
}
