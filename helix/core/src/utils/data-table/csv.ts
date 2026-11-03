/**
 * A table's rows as CSV, which the web element and a phone's machine both write.
 *
 * **A text value that a spreadsheet would run is quoted as text.** A cell opening
 * with `=`, `+`, `-` or `@` is a formula to a spreadsheet, and a result is often
 * something a reader did not write: those values gain a leading apostrophe, the
 * mark spreadsheets read as "this is text". Numbers are left alone, so a negative
 * one stays a number.
 */
import { valueAt } from '../row-data/row-data.js'
import type { DataRow } from '../row-order/row-order.js'

/** One value as a field of a line. */
const quote = (value: unknown): string => {
  if (value === undefined || value === null) {
    return ''
  }
  let text = String(value)
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`
  }
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/** The heading of each column, then a line for each row of what its `field` holds. */
export const csvOf = (
  columns: readonly { readonly field: string; readonly heading: string }[],
  rows: readonly DataRow[],
): string => {
  const head = columns.map((column) => quote(column.heading))
  const body = rows.map((row) => columns.map((column) => quote(valueAt(row, column.field))))
  return [head, ...body].map((line) => line.join(',')).join('\r\n')
}
