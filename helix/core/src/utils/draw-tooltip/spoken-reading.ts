import type { Row } from '../read-series/read-series.js'

/**
 * A reading in words, for a chart's readout: the row's name and every cell
 * that says something, or the one cell the series keys rest on.
 *
 * The table's own text, as the bubble shows it, so the words and the picture
 * agree, and nothing in it is English: the names are the table's headings. A
 * blank cell says nothing and is left out.
 */
export const spokenReading = (row: Row, column?: number): string => {
  const cell = column === undefined ? undefined : row.cells[column]
  if (cell) {
    return `${row.label}, ${cell.name} ${cell.text}`.trim()
  }
  const said = row.cells
    .filter((one) => one.text.trim() !== '')
    .map((one) => `${one.name} ${one.text}`.trim())
  return said.length === 0 ? row.label : `${row.label}: ${said.join(', ')}`
}
