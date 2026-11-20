/*
 * The order a table draws its rows in, and where each stands among the rows it
 * nests, which the web element and a phone's machine both read.
 */
import { type DataRow, parse, sort } from '../row-order/row-order.js'

/** A cell's text as a number, with the commas that group its digits taken out. */
const numberOf = (value: string): number => Number(value.replaceAll(',', ''))

/**
 * `rows` in the order `written` says, each compared by the text `textOf` reads
 * of it in the sorted column. A column of numbers compares as numbers, so `980`
 * comes before `1,204` and a negative sorts below zero. A column with any word
 * in it collates as text, digits by their value.
 */
export const sortedRows = <Row>(
  rows: readonly Row[],
  written: string,
  textOf: (row: Row) => string,
): readonly Row[] => {
  const spec = parse(written)
  if (!spec) {
    return rows
  }
  const records = rows.map((element) => ({ element, value: textOf(element) }))
  const numeric = records.every(({ value }) => value === '' || Number.isFinite(numberOf(value)))
  const order = numeric
    ? (row: DataRow): unknown => (row.value === '' ? '' : numberOf(row.value as string))
    : (row: DataRow): unknown => row.value
  const sorted = sort(records, spec, [{ field: spec.field, order }]) as unknown as typeof records
  return sorted.map((record) => record.element)
}

/** A row as nesting reads it: its key, and the key of the row it sits under. */
export interface NestingRow {
  readonly key: string
  readonly parent: string
}

/**
 * The rows of a tree in the order they are drawn: each row followed by the
 * rows under it while it is open, at every depth, keeping the order `rows` is
 * in among the rows under one row. A row under a key no row has is drawn at the
 * top.
 */
export const nestedRows = <Row extends NestingRow>(
  rows: readonly Row[],
  open: ReadonlySet<string>,
): Row[] => {
  const present = new Set(rows.map((row) => row.key))
  const under = new Map<string, Row[]>()
  for (const row of rows) {
    const at = row.parent !== '' && present.has(row.parent) ? row.parent : ''
    under.set(at, [...(under.get(at) ?? []), row])
  }
  const drawn: Row[] = []
  const seen = new Set<Row>()
  const walk = (parent: string): void => {
    for (const row of under.get(parent) ?? []) {
      /* A row set under one of its own rows would walk for ever. */
      if (seen.has(row)) {
        continue
      }
      seen.add(row)
      drawn.push(row)
      if (open.has(row.key)) {
        walk(row.key)
      }
    }
  }
  walk('')
  return drawn
}

/** How deep a row sits, from 1, and whether rows sit under it. */
export interface RowShape {
  branch: boolean
  level: number
}

/** How deep each row sits and whether rows sit under it, by key. */
export const rowShapes = (rows: readonly NestingRow[]): Map<string, RowShape> => {
  const parents = new Map(rows.map(({ key, parent }) => [key, parent]))
  const shapes = new Map<string, RowShape>()
  for (const key of parents.keys()) {
    let level = 1
    let at = parents.get(key) ?? ''
    const passed = new Set([key])
    while (at !== '' && parents.has(at) && !passed.has(at)) {
      passed.add(at)
      level += 1
      at = parents.get(at) ?? ''
    }
    shapes.set(key, { branch: false, level })
  }
  for (const parent of parents.values()) {
    const shape = shapes.get(parent)
    if (shape) {
      shape.branch = true
    }
  }
  return shapes
}
