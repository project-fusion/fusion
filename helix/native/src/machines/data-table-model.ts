/**
 * What a phone's table drawn from an array reads of what it is passed: its
 * columns, as written and as a reader arranged them, and what each reads of a row.
 *
 * Core's arithmetic decides which rows show, as on the web.
 */
import {
  type Axis,
  arranged,
  type DataRow,
  grow,
  ordered,
  valueAt,
  window_,
} from '@fusion.dev/helix-core/data-table'
import type { RowShape } from '@fusion.dev/helix-core/table'
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'

type Read = Readonly<Record<string, unknown>>

/** A column as the table reads it. */
export interface DataColumn {
  readonly element: ReactElement
  readonly field: string
  readonly hidden: boolean
  /** What a cell draws of a row. */
  readonly read: (row: DataRow) => unknown
  /** What the column sorts and searches a row by. */
  readonly order: (row: DataRow) => unknown
  readonly rowHeader: boolean
}

const isColumn = (child: unknown): child is ReactElement =>
  isValidElement(child) && (child.type as { tag?: unknown }).tag === 'helix-table-column'

const isHidden = (value: unknown): boolean =>
  value !== undefined && value !== null && value !== false && value !== 'until-found'

const asColumn = (element: ReactElement): DataColumn => {
  const props = element.props as Read
  const field = typeof props.field === 'string' ? props.field : ''
  const cell = props.cell as ((row: DataRow) => unknown) | undefined
  const compare = props.compare as ((row: DataRow) => unknown) | undefined
  return {
    element,
    field,
    hidden: isHidden(props.hidden),
    order: (row) => {
      const compared = compare?.(row)
      return compared === undefined ? valueAt(row, field) : compared
    },
    read: (row) => {
      const drawn = cell?.(row)
      return drawn === undefined ? valueAt(row, field) : drawn
    },
    rowHeader: props.rowHeader === true,
  }
}

/** The columns passed in, each as it was written. */
export const columnsOf = (children: unknown): readonly DataColumn[] =>
  Children.toArray(children as ReactNode)
    .filter(isColumn)
    .map(asColumn)

/** The columns in the order a reader moved them to; what the order leaves out follows. */
export const inOrder = (columns: readonly DataColumn[], order: string): readonly DataColumn[] => {
  const wanted = order.split(/\s+/).filter((one) => one !== '')
  if (wanted.length === 0) {
    return columns
  }
  const place = (column: DataColumn): number => {
    const at = wanted.indexOf(column.field)
    return at < 0 ? wanted.length : at
  }
  return columns
    .map((column, at) => ({ at, column }))
    .sort((one, two) => place(one.column) - place(two.column) || one.at - two.at)
    .map((one) => one.column)
}

/** The axes a search and a sort read: each column with a field. */
export const axesOf = (columns: readonly DataColumn[]): Axis[] =>
  columns
    .filter((column) => column.field !== '')
    .map((column) => ({ field: column.field, order: column.order }))

/** A row's key: its `row-key` value, or its place. */
export const keyOf = (row: DataRow, place: number, rowKey: string): string => {
  const value = rowKey === '' ? undefined : valueAt(row, rowKey)
  return value === undefined || value === null ? String(place) : String(value)
}

/** What a reader has chosen of the rows. */
export interface Asked {
  readonly childField: string
  readonly filter: string
  readonly open: ReadonlySet<string>
  readonly page: number
  readonly rowKey: string
  readonly server: boolean
  readonly size: number
  readonly sort: string
  readonly total: number
}

/** The rows a page draws, how many there are, and each key past the page. */
export interface Seen {
  /** Every key in reading order. */
  /** Every row the search left, past the page, in order. */
  readonly all: readonly DataRow[]
  readonly every: readonly string[]
  /** How many rows the search left. */
  readonly matched: number
  /** Each row of the page with its key. */
  readonly page: readonly { readonly key: string; readonly row: DataRow }[]
  /** Depth and whether each row holds rows, in a tree alone. */
  readonly shapes: ReadonlyMap<string, RowShape>
}

const keyed = (rows: readonly DataRow[], rowKey: string, start = 0) =>
  rows.map((row, at) => ({ key: keyOf(row, start + at, rowKey), row }))

const treeSeen = (rows: readonly DataRow[], axes: Axis[], asked: Asked): Seen => {
  const tree = grow(rows, axes, {
    field: asked.childField,
    isOpen: (row) => asked.open.has(keyOf(row, -1, asked.rowKey)),
    query: asked.filter,
    spec: asked.sort,
  })
  const shapes = new Map<string, RowShape>()
  const page = window_(tree.rows, asked.page, asked.size).map((row) => {
    const key = keyOf(row, -1, asked.rowKey)
    const placed = tree.placed.get(row)
    shapes.set(key, { branch: placed?.branch ?? false, level: placed?.level ?? 1 })
    return { key, row }
  })
  return {
    all: tree.rows,
    every: tree.every.map((row) => keyOf(row, -1, asked.rowKey)),
    matched: asked.server ? Math.max(asked.total, tree.rows.length) : tree.rows.length,
    page,
    shapes,
  }
}

const NO_SHAPES: ReadonlyMap<string, RowShape> = new Map()

/** What core's arithmetic leaves of the rows for what a reader asked. */
export const seenOf = (rows: readonly DataRow[], axes: Axis[], asked: Asked): Seen => {
  if (asked.childField !== '') {
    return treeSeen(rows, axes, asked)
  }
  if (asked.server) {
    return {
      all: rows,
      every: keyed(rows, asked.rowKey).map((one) => one.key),
      matched: Math.max(asked.total, rows.length),
      page: keyed(rows, asked.rowKey),
      shapes: NO_SHAPES,
    }
  }
  const view = ordered(rows, axes, {
    page: asked.page,
    query: asked.filter,
    size: asked.size,
    spec: asked.sort,
  })
  const all = arranged(rows, axes, { query: asked.filter, spec: asked.sort })
  const places = new Map(rows.map((row, at) => [row, at]))
  return {
    all: all.rows,
    every: all.rows.map((row) => keyOf(row, places.get(row) ?? 0, asked.rowKey)),
    matched: view.matched,
    page: view.rows.map((row) => ({
      key: keyOf(row, places.get(row) ?? 0, asked.rowKey),
      row,
    })),
    shapes: NO_SHAPES,
  }
}

/** The words of a value a cell holds. */
export const cellContent = (value: unknown): ReactNode =>
  value === undefined || value === null ? '' : (value as ReactNode)
