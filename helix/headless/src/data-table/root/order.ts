/**
 * Filter, sort, then window. In that order, over the whole set, every time.
 *
 * **This is the file that stops the classic virtualization bug.** Sorting the
 * rendered window looks completely correct on the first screen and is wrong
 * everywhere else, and it is the natural thing to write once rows are data and
 * only some of them are drawn. Keeping the three operations here, as functions
 * over an array with no knowledge of what is on screen, is what makes that
 * mistake hard to make: nothing in this module can see a window, and `window()`
 * is the last thing applied rather than the first.
 *
 * The order is not a preference. Filtering after sorting sorts rows that are
 * about to be thrown away, which is only slower; paging before either is the bug.
 * Filter narrows, sort arranges what is left, the page is a slice of that, and
 * the count a reader is shown is the length after filtering rather than the
 * length of the data, or the pagination promises pages that are empty.
 */

/**
 * A row, which is whatever the consumer's data is.
 *
 * Not `DataRow`: `@helix-io/core` already exports one, for a cell read out of a
 * chart series, and the headless barrel re-exports both. Two different `DataRow`s
 * reaching a consumer through one package is the kind of ambiguity TypeScript
 * refuses outright, which is how this was caught.
 */
export type DataRow = Readonly<Record<string, unknown>>

/** One column's contribution, reduced to the two functions this module needs. */
export interface Axis {
  /** The field this axis is named by, matched against a sort spec. */
  field: string
  /** The value to compare and match on, which is not always what the cell shows. */
  order: (row: DataRow) => unknown
}

/** A parsed `field:direction`. */
export interface Sort {
  direction: 'asc' | 'desc'
  field: string
}

/**
 * `field:asc` and `field:desc`, and nothing else.
 *
 * A bare `field` parses as ascending, because that is what a URL query usually
 * carries and refusing it would make the common case the verbose one. Anything
 * unparseable is no sort rather than an error: this value arrives from a query
 * string as often as from code, and a bad one should leave the table in the
 * order the data came in rather than break the page.
 */
export const parse = (spec: string): Sort | undefined => {
  const trimmed = spec.trim()
  if (trimmed === '') {
    return undefined
  }
  const [field = '', direction = 'asc'] = trimmed.split(':')
  if (field === '' || (direction !== 'asc' && direction !== 'desc')) {
    return undefined
  }
  return { direction, field }
}

/** A `Sort` written back out, so the property and the attribute agree. */
export const format = (sort: Sort | undefined): string =>
  sort ? `${sort.field}:${sort.direction}` : ''

/**
 * What a reader gets on the next click of a sortable heading.
 *
 * Ascending, descending, then none. **The third state is not an omission to be
 * tidied away**: the order rows arrived in is information the data came with,
 * often the server's own relevance ranking, and a two-state cycle makes it
 * unreachable once a reader has sorted once.
 */
export const cycle = (current: Sort | undefined, field: string): Sort | undefined => {
  if (current?.field !== field) {
    return { direction: 'asc', field }
  }
  return current.direction === 'asc' ? { direction: 'desc', field } : undefined
}

/**
 * Rows matching a query, across every axis.
 *
 * One query over all columns rather than a predicate per column, which is what a
 * reader means by a search box above a table. Per-column predicates are a
 * different feature and compose with this rather than replacing it.
 *
 * Case-insensitive and substring, on the ordering value rather than the rendered
 * one: a cell showing a formatted date should be findable by the text a reader
 * sees, and a cell showing an icon should be findable by the value behind it.
 * Where those differ, `compare` on the column is what decides, which is the same
 * function sorting uses, so search and sort cannot disagree about what a column
 * holds.
 */
export const filter = (
  rows: readonly DataRow[],
  query: string,
  axes: readonly Axis[],
): DataRow[] => {
  const needle = query.trim().toLocaleLowerCase()
  if (needle === '') {
    return [...rows]
  }
  return rows.filter((row) =>
    axes.some((axis) => text(axis.order(row)).toLocaleLowerCase().includes(needle)),
  )
}

/**
 * Rows in the asked-for order, stably.
 *
 * **Stable, and that is load-bearing rather than tidy.** `Array.prototype.sort`
 * is required to be stable since ES2019, so equal rows keep the order they
 * arrived in, which means sorting by one column and then another leaves the
 * first as the tiebreak. A reader who sorts by status and then by name expects
 * exactly that, and an unstable sort would shuffle equal rows on every
 * re-render, which reads as the table twitching.
 */
export const sort = (
  rows: readonly DataRow[],
  spec: Sort | undefined,
  axes: readonly Axis[],
): DataRow[] => {
  const axis = spec ? axes.find((one) => one.field === spec.field) : undefined
  if (!spec || !axis) {
    return [...rows]
  }
  const sign = spec.direction === 'asc' ? 1 : -1
  return [...rows].sort((left, right) => compare(axis.order(left), axis.order(right), sign))
}

/**
 * One page of rows, clamped.
 *
 * A page past the end returns the last page rather than nothing, because the
 * usual way to be past the end is a bookmarked link after the result shrank, and
 * an empty table is a worse answer than the last page of a smaller one. The
 * same clamp `helix-pagination` already applies to what it reports.
 */
export const window_ = (rows: readonly DataRow[], page: number, size: number): DataRow[] => {
  if (size <= 0) {
    return [...rows]
  }
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const wanted = Math.min(pages, Math.max(1, Math.floor(page) || 1))
  const from = (wanted - 1) * size
  return rows.slice(from, from + size)
}

/**
 * A value as text, for matching.
 *
 * `null` and `undefined` become empty rather than their own names, so a search
 * for "null" does not match every hole in the data.
 */
const text = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ''
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  return String(value)
}

/**
 * Two cell values ordered, with the types a table actually holds.
 *
 * **Numbers compare as numbers and strings collate.** `String(a) < String(b)`
 * puts 10 before 9 and puts every accented word after every unaccented one, and
 * both look like the sort is broken while every value in the column is correct.
 * `localeCompare` handles the second, and the numeric branch handles the first.
 *
 * **Holes sort last in both directions**, which is deliberate and is the one
 * choice here a reader could disagree with. A missing value is not smaller than
 * a present one, it is absent, and burying the holes at the end is what a reader
 * scanning for the largest or smallest actual value wants. Reversing them with
 * the direction puts every hole first on a descending sort, which is the least
 * useful screen the data can produce.
 *
 * **`sign` is applied in here rather than to the result**, and that is why it is
 * a parameter rather than the caller's multiplication. Written the obvious way,
 * as `sign * compare(a, b)`, the constant this returns for a hole flips with the
 * direction and the holes lead a descending sort: the comment above it claimed
 * otherwise for as long as it took the spec to be written, which is the argument
 * for writing the spec.
 */
const compare = (left: unknown, right: unknown, sign: number): number => {
  const leftMissing = left === null || left === undefined || left === ''
  const rightMissing = right === null || right === undefined || right === ''
  if (leftMissing || rightMissing) {
    return leftMissing && rightMissing ? 0 : leftMissing ? 1 : -1
  }
  if (typeof left === 'number' && typeof right === 'number') {
    return sign * (left - right)
  }
  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return sign * (Number(left) - Number(right))
  }
  if (left instanceof Date && right instanceof Date) {
    return sign * (left.getTime() - right.getTime())
  }
  return (
    sign * text(left).localeCompare(text(right), undefined, { numeric: true, sensitivity: 'base' })
  )
}

/** What one pass over the data produces: the window, and the counts around it. */
export interface Ordered {
  /** Rows after filtering, before paging. The number a pagination must page. */
  matched: number
  /** The rows to draw. */
  rows: DataRow[]
  /** Rows before filtering, which is what tells a reader a filter is on. */
  total: number
}

/**
 * The whole pass, in the one order that is correct.
 *
 * Exported as a single function so a caller cannot get the order wrong by
 * calling the three in the sequence that reads naturally, which is the sequence
 * that pages before it sorts.
 */
export const ordered = (
  rows: readonly DataRow[],
  axes: readonly Axis[],
  { page, query, size, spec }: { page: number; query: string; size: number; spec: string },
): Ordered => {
  const matched = filter(rows, query, axes)
  const arranged = sort(matched, parse(spec), axes)
  return { matched: matched.length, rows: window_(arranged, page, size), total: rows.length }
}
