/**
 * Which rows changed between two sets of `rows`, for `flash-changes`.
 *
 * Pure and beside the family's `index.ts`, because which rows are news is a
 * fact about the data, and a spec can hold it without a page.
 *
 * **A row is known by its key and compared by its data.** A page that fetches
 * again hands the table a new object for every row, so the same object is not
 * the test: a row whose values are the same is not news, and a row whose
 * values differ is, however deep in the row the difference is.
 */

import type { DataRow } from '@fusion.dev/helix-core'

/** How deep `sameData` looks into a row before it compares by identity, which also stops a cycle. */
const DEPTH = 8

/**
 * Whether two values hold the same data: the same value, two dates at the
 * same time, or arrays and plain objects whose members hold the same data.
 * `skip` names a member of the outermost objects left out, such as the field
 * that holds a row's child rows, which are rows of their own.
 */
export const sameData = (a: unknown, b: unknown, skip?: string, depth = 0): boolean => {
  if (Object.is(a, b)) {
    return true
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false
  }
  if (depth >= DEPTH || Array.isArray(a) !== Array.isArray(b)) {
    return false
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((one, at) => sameData(one, b[at], undefined, depth + 1))
  }
  const left = Object.keys(a).filter((name) => name !== skip)
  const right = Object.keys(b).filter((name) => name !== skip)
  return (
    left.length === right.length &&
    left.every(
      (name) =>
        Object.hasOwn(b, name) &&
        sameData(
          (a as Record<string, unknown>)[name],
          (b as Record<string, unknown>)[name],
          undefined,
          depth + 1,
        ),
    )
  )
}

/** Every row, the rows under each row with `childField` included, in reading order. */
export const everyRow = (rows: readonly DataRow[], childField?: string): DataRow[] => {
  if (!childField) {
    return [...rows]
  }
  return rows.flatMap((row) => {
    const children = row[childField]
    return [row, ...(Array.isArray(children) ? everyRow(children as DataRow[], childField) : [])]
  })
}

/** Each row by its key, skipping a row with no key. */
export const rowsByKey = (
  rows: Iterable<DataRow>,
  keyOf: (row: DataRow) => string | undefined,
): Map<string, DataRow> => {
  const found = new Map<string, DataRow>()
  for (const row of rows) {
    const key = keyOf(row)
    if (key !== undefined) {
      found.set(key, row)
    }
  }
  return found
}

/** What `changedKeys` leaves out. */
export interface ChangedOptions {
  /** Whether a row that is new to `now` counts. Off for the rows that answer a request for more. */
  arrivals: boolean
  /** The field that holds a row's child rows, left out of the comparison. */
  childField?: string | undefined
  /** Whether a row is one the table wrote itself, such as a value a reader saved. */
  own?: ((row: DataRow) => boolean) | undefined
}

/**
 * The keys of the rows in `now` that changed since `before`: a row whose data
 * differs, and a row that was not there. **None at all when no key is in
 * both**, since rows that share nothing with the ones before are new data,
 * such as another page or another query.
 */
export const changedKeys = (
  before: ReadonlyMap<string, DataRow>,
  now: ReadonlyMap<string, DataRow>,
  options: ChangedOptions,
): Set<string> => {
  const changed = new Set<string>()
  let shared = false
  for (const [key, row] of now) {
    const was = before.get(key)
    if (was === undefined) {
      if (options.arrivals) {
        changed.add(key)
      }
      continue
    }
    shared = true
    if (was !== row && !options.own?.(row) && !sameData(was, row, options.childField)) {
      changed.add(key)
    }
  }
  return shared ? changed : new Set()
}
