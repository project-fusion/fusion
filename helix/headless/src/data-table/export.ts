/**
 * Writing a Data Table's rows out as text: CSV, TSV, or JSON.
 *
 * String handling with no DOM in it, so the pure spec covers it directly. The
 * table decides which rows, columns, and values go in, and this writes them.
 */

/** Which rows an export holds. */
export type ExportRows = 'all' | 'filtered' | 'selected'

/** Which columns an export holds. */
export type ExportColumns = 'all' | 'visible'

/** Whether an export holds the values as the cells show them, or the values in the rows. */
export type ExportValues = 'raw' | 'shown'

/** The kind of file an export writes. `xlsx` needs the `data-table/xlsx` entry. */
export type ExportFormat = 'csv' | 'json' | 'tsv' | 'xlsx'

/** What to export. Each part left out takes its default: the filtered rows, the visible columns, the values as shown, and CSV. */
export interface ExportOptions {
  columns?: ExportColumns | undefined
  format?: ExportFormat | undefined
  rows?: ExportRows | undefined
  values?: ExportValues | undefined
}

/** The rows and columns an export holds, before they are written. */
export interface ExportData {
  /** Each column's field, in order. */
  fields: string[]
  /** Each column's heading, in order. */
  headings: string[]
  /** Each row's values, in the columns' order. */
  rows: unknown[][]
}

/** The type a file of each format is served as. */
export const EXPORT_TYPES: Record<ExportFormat, string> = {
  csv: 'text/csv',
  json: 'application/json',
  tsv: 'text/tab-separated-values',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

/**
 * A text value a spreadsheet would run as a formula, quoted as text.
 *
 * A cell opening with `=`, `+`, `-` or `@` is a formula to a spreadsheet, and a
 * result is often something a reader did not write, so those values gain a
 * leading apostrophe, the mark spreadsheets read as text. Numbers are left
 * alone, so a negative one stays a number.
 */
export const guardFormula = (value: unknown): string => {
  if (value === undefined || value === null) {
    return ''
  }
  const text = value instanceof Date ? value.toISOString() : String(value)
  return typeof value === 'string' && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
}

const csvCell = (value: unknown): string => {
  const text = guardFormula(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/** A TSV cell has no quoting, so a tab or a line break in a value becomes a space. */
const tsvCell = (value: unknown): string => guardFormula(value).replace(/[\t\r\n]+/g, ' ')

/** Writes the rows as CSV, TSV, or JSON. JSON is an array of objects keyed by field. */
export const exportText = (data: ExportData, format: Exclude<ExportFormat, 'xlsx'>): string => {
  if (format === 'json') {
    return JSON.stringify(
      data.rows.map((row) =>
        Object.fromEntries(data.fields.map((field, at) => [field, row[at] ?? null])),
      ),
      null,
      2,
    )
  }
  const cell = format === 'tsv' ? tsvCell : csvCell
  const separator = format === 'tsv' ? '\t' : ','
  return [data.headings, ...data.rows].map((line) => line.map(cell).join(separator)).join('\r\n')
}
