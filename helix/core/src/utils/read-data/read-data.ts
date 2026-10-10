import { formatNumbers } from '../format-numbers/format-numbers.js'
import type { Row, RowCell, Series } from '../read-series/read-series.js'

/**
 * One cell of a chart's `data`: a number, words, a blank, or a number with
 * the words it is shown as, such as `{ value: 128000, text: '$128k' }`.
 */
export type ChartDatum = number | string | null | undefined | { text: string; value: number }

/**
 * A chart's readings given as data, in the shape a table has.
 *
 * ```js
 * chart.data = {
 *   caption: 'Sessions by channel',
 *   columns: ['Month', 'Direct', 'Referral'],
 *   rows: [
 *     ['Jan', 10, 4],
 *     ['Feb', 20, 8],
 *   ],
 * }
 * ```
 */
export interface ChartData {
  /**
   * The chart's name where it has no `label`, as a table's caption is, and
   * the series' name where there is one column and no heading for it.
   */
  caption?: string
  /**
   * The column headings. The first heads the row labels, and each after it
   * names a series.
   */
  columns: string[]
  /**
   * One row per reading: its label first, then a cell per column.
   */
  rows: ReadonlyArray<readonly [label: string, ...cells: ChartDatum[]]>
}

/**
 * Whether `data` has the shape a chart reads: an object with an array of
 * `columns` and an array of `rows`, each row an array. Any other value draws
 * the empty state, where it would throw from the render.
 */
export const isChartData = (data: unknown): data is ChartData => {
  const shape = data as Partial<ChartData> | null
  return (
    typeof shape === 'object' &&
    shape !== null &&
    Array.isArray(shape.columns) &&
    Array.isArray(shape.rows) &&
    shape.rows.every((row) => Array.isArray(row))
  )
}

/**
 * The number in a cell and the words it is shown as, written in `locale`.
 *
 * Through `formatNumbers`, which keeps one formatter a locale: building an
 * `Intl.NumberFormat` for each cell was 225 milliseconds of 10,000 readings,
 * measured in Chromium on October 10, 2026, the most of what drawing them cost.
 */
const cellOf = (datum: ChartDatum, locale: string): { text: string; value?: number } => {
  const value = numberIn(datum)
  if (datum === null || datum === undefined) {
    return { text: '' }
  }
  if (typeof datum === 'object') {
    return value === undefined ? { text: datum.text } : { text: datum.text, value }
  }
  if (typeof datum === 'number') {
    return value === undefined ? { text: '' } : { text: formatNumbers(locale)(datum), value }
  }
  return value === undefined ? { text: datum } : { text: datum, value }
}

/**
 * The number in a cell, where it holds one, without the words it is shown as,
 * which a series has no use for: writing 400,000 numbers in a locale to throw
 * the words away was most of what reading four series of 100,000 cost.
 */
const numberIn = (datum: ChartDatum): number | undefined => {
  if (datum === null || datum === undefined) {
    return undefined
  }
  if (typeof datum === 'object') {
    return Number.isFinite(datum.value) ? datum.value : undefined
  }
  if (typeof datum === 'number') {
    return Number.isFinite(datum) ? datum : undefined
  }
  /* Words are read as a table cell's text is: `Number()` and not
     `parseFloat`, so `12abc` is words and not 12. */
  const value = Number(datum.trim())
  return Number.isFinite(value) && datum.trim() !== '' ? value : undefined
}

/**
 * Reads `data` as series, one per column after the first, as `readSeries`
 * reads a table: a column with no numbers in it is not a series, and a blank
 * keeps its row's place.
 */
export const seriesFromData = (data: ChartData): Series[] => {
  const names = data.columns.slice(1)
  let count = 0
  for (const row of data.rows) {
    count = Math.max(count, row.length - 1)
  }
  return Array.from({ length: count }, (_, column) => ({
    name: names[column] ?? data.caption ?? '',
    points: data.rows.flatMap((row, at) => {
      const value = numberIn(row[column + 1] as ChartDatum)
      return value === undefined ? [] : [{ at, label: String(row[0] ?? ''), value }]
    }),
  })).filter((one) => one.points.length > 0)
}

/**
 * Reads `data` as rows, as `readRows` reads a table: every cell with its
 * words and its number, including the columns nothing plots.
 */
export const rowsFromData = (data: ChartData, locale = ''): Row[] =>
  data.rows.map((row) => ({
    cells: row.slice(1).map(
      (datum, column): RowCell => ({
        name: data.columns[column + 1] ?? '',
        ...cellOf(datum, locale),
      }),
    ),
    label: String(row[0] ?? ''),
  }))
