/**
 * A Data Table's view: everything a reader can change about how the rows are
 * shown, as one value that round-trips through JSON.
 *
 * **One value, so a view can be stored.** A URL, a saved view, a preset and a
 * server request each need the query, the filters, the sort, the columns and
 * the page size together, and five properties read one at a time can be caught
 * half changed. The table still keeps `sort`, `filter`, `order`, `hidden` and
 * `page-size`; each is a window on this value.
 *
 * String handling and comparisons with no DOM in them, so the pure spec covers
 * it directly.
 */

import type { ColumnType } from '../table/column-type.js'

export type { ColumnType }

/** Which end of the row a pinned column stays at while the table scrolls. */
export type PinEdge = 'end' | 'start'

/** One filter on one column. */
export interface ViewFilter {
  /** The column's `field`. */
  field: string
  /** The comparison, one of the names `operatorsFor` gives for the column's type. */
  operator: string
  /** What the field is compared to. A filter on one column matches any of them. */
  values: string[]
}

/** The columns' arrangement. */
export interface ViewColumns {
  /** The fields that are hidden. */
  hidden: string[]
  /** Every field in the order shown. An empty list keeps the written order. */
  order: string[]
  /** The fields pinned to an end of the row. */
  pinned: Record<string, PinEdge>
  /** The widths a reader set, as CSS lengths, by field. */
  widths: Record<string, string>
}

/** Everything a reader can change about how a Data Table shows its rows. */
export interface DataTableView {
  /** The arrangement of the columns. */
  columns: ViewColumns
  /** The column filters. Filters on different columns all have to match. */
  filters: ViewFilter[]
  /** The rows on a page, `0` for every row. */
  pageSize: number
  /** The search text. */
  query: string
  /** The sort order, as `field:direction`, or empty for the order the rows arrived in. */
  sort: string
}

/** A view with only some of its parts, such as a preset or a saved view. */
export type PartialView = {
  [K in Exclude<keyof DataTableView, 'columns'>]?: DataTableView[K] | undefined
} & {
  columns?: { [K in keyof ViewColumns]?: ViewColumns[K] | undefined } | undefined
}

/** A view with nothing changed. */
export const emptyView = (): DataTableView => ({
  columns: { hidden: [], order: [], pinned: {}, widths: {} },
  filters: [],
  pageSize: 0,
  query: '',
  sort: '',
})

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((one) => typeof one === 'string') : []

const record = <T extends string>(value: unknown, allowed?: readonly T[]): Record<string, T> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  const out: Record<string, T> = {}
  for (const [key, one] of Object.entries(value)) {
    if (typeof one === 'string' && (!allowed || (allowed as readonly string[]).includes(one))) {
      out[key] = one as T
    }
  }
  return out
}

/**
 * Reads a view from a value that may have come from anywhere, such as JSON a
 * reader saved. Anything that is not part of a view is left out, so a stored
 * view from an older page still reads.
 */
export const readView = (value: unknown): DataTableView => {
  const view = emptyView()
  if (!value || typeof value !== 'object') {
    return view
  }
  const given = value as Record<string, unknown>
  return mergeView(view, {
    columns:
      given.columns && typeof given.columns === 'object'
        ? (() => {
            const columns = given.columns as Record<string, unknown>
            return {
              hidden: strings(columns.hidden),
              order: strings(columns.order),
              pinned: record(columns.pinned, ['end', 'start'] as const),
              widths: record(columns.widths),
            }
          })()
        : undefined,
    filters: Array.isArray(given.filters)
      ? given.filters.flatMap((one): ViewFilter[] => {
          if (!one || typeof one !== 'object') {
            return []
          }
          const { field, operator, values } = one as Record<string, unknown>
          return typeof field === 'string' && field !== ''
            ? [
                {
                  field,
                  operator: typeof operator === 'string' ? operator : '',
                  values: strings(values),
                },
              ]
            : []
        })
      : undefined,
    pageSize:
      typeof given.pageSize === 'number' && given.pageSize >= 0
        ? Math.floor(given.pageSize)
        : undefined,
    query: typeof given.query === 'string' ? given.query : undefined,
    sort: typeof given.sort === 'string' ? given.sort : undefined,
  })
}

/**
 * Reads a partial view from a value that may have come from anywhere, keeping
 * only the parts it names, so a preset that names its filters leaves the sort
 * alone.
 */
export const readPartialView = (value: unknown): PartialView => {
  if (!value || typeof value !== 'object') {
    return {}
  }
  const whole = readView(value)
  const named = value as Record<string, unknown>
  const columns = named.columns as Record<string, unknown> | undefined
  return {
    ...('filters' in named ? { filters: whole.filters } : {}),
    ...('pageSize' in named ? { pageSize: whole.pageSize } : {}),
    ...('query' in named ? { query: whole.query } : {}),
    ...('sort' in named ? { sort: whole.sort } : {}),
    ...(columns && typeof columns === 'object'
      ? {
          columns: Object.fromEntries(
            (['hidden', 'order', 'pinned', 'widths'] as const)
              .filter((key) => key in columns)
              .map((key) => [key, whole.columns[key]]),
          ),
        }
      : {}),
  }
}

/** Reads a view from JSON. Text that is not JSON reads as a view with nothing changed. */
export const parseView = (json: string): DataTableView => {
  try {
    return readView(JSON.parse(json))
  } catch {
    return emptyView()
  }
}

/** Writes a view as JSON, with its keys in a fixed order so two equal views write the same text. */
export const viewJson = (view: DataTableView): string => {
  const sorted = <T>(of: Record<string, T>): Record<string, T> =>
    Object.fromEntries(Object.entries(of).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
  return JSON.stringify({
    columns: {
      hidden: [...view.columns.hidden].sort(),
      order: view.columns.order,
      pinned: sorted(view.columns.pinned),
      widths: sorted(view.columns.widths),
    },
    filters: view.filters.map(({ field, operator, values }) => ({ field, operator, values })),
    pageSize: view.pageSize,
    query: view.query,
    sort: view.sort,
  })
}

/** Whether two views show the rows the same way. */
export const sameView = (a: DataTableView, b: DataTableView): boolean => viewJson(a) === viewJson(b)

/**
 * A view with the parts of another laid over it. A part the other names
 * replaces the whole of that part, so a preset with `filters` clears every
 * other filter, and one without leaves them alone.
 */
export const mergeView = (base: DataTableView, over: PartialView): DataTableView => ({
  columns: {
    hidden: over.columns?.hidden ?? base.columns.hidden,
    order: over.columns?.order ?? base.columns.order,
    pinned: over.columns?.pinned ?? base.columns.pinned,
    widths: over.columns?.widths ?? base.columns.widths,
  },
  filters: over.filters ?? base.filters,
  pageSize: over.pageSize ?? base.pageSize,
  query: over.query ?? base.query,
  sort: over.sort ?? base.sort,
})

/**
 * Whether a view already holds everything a partial view names, which is how
 * a preset knows it is the one in force.
 */
export const holdsView = (view: DataTableView, part: PartialView): boolean =>
  sameView(mergeView(view, part), view)

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
