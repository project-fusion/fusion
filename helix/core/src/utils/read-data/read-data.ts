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

/** The number in a cell and the words it is shown as, written in `locale`. */
const cellOf = (datum: ChartDatum, locale: string): { text: string; value?: number } => {
  if (datum === null || datum === undefined) {
    return { text: '' }
  }
  if (typeof datum === 'object') {
    return Number.isFinite(datum.value)
      ? { text: datum.text, value: datum.value }
      : { text: datum.text }
  }
  if (typeof datum === 'number') {
    return Number.isFinite(datum)
      ? { text: new Intl.NumberFormat(locale || undefined).format(datum), value: datum }
      : { text: '' }
  }
  /* Words are read as a table cell's text is: `Number()` and not
     `parseFloat`, so `12abc` is words and not 12. */
  const value = Number(datum.trim())
  return Number.isFinite(value) && datum.trim() !== '' ? { text: datum, value } : { text: datum }
}

/**
 * Reads `data` as series, one per column after the first, as `readSeries`
 * reads a table: a column with no numbers in it is not a series, and a blank
 * keeps its row's place.
 */
export const seriesFromData = (data: ChartData, locale = ''): Series[] => {
  const names = data.columns.slice(1)
  const count = Math.max(0, ...data.rows.map((row) => row.length - 1))
  return Array.from({ length: count }, (_, column) => ({
    name: names[column] ?? data.caption ?? '',
    points: data.rows.flatMap((row, at) => {
      const value = cellOf(row[column + 1] as ChartDatum, locale).value
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
