import type { Row } from '../read-series/read-series.js'

/**
 * A reading in words, for a chart's readout: the row's name and every cell
 * that says something, or the one cell the series keys rest on.
 *
 * The table's own text, as the bubble shows it, so the words and the picture
 * agree, and nothing in it is English: the names are the table's headings. A
 * blank cell says nothing and is left out, and so is a cell `shows` answers
 * false for, which is a series a legend hid.
 *
 * `position` follows in brackets, such as "2 of 12", where the chart gives
 * one: last, so the reading is heard before where it stands.
 */
export const spokenReading = (
  row: Row,
  column?: number,
  shows: (cell: number) => boolean = () => true,
  position = '',
): string => {
  const after = position === '' ? '' : ` (${position})`
  const cell = column === undefined ? undefined : row.cells[column]
  if (cell) {
    return `${`${row.label}, ${cell.name} ${cell.text}`.trim()}${after}`
  }
  const said = row.cells
    .filter((one, index) => one.text.trim() !== '' && shows(index))
    .map((one) => `${one.name} ${one.text}`.trim())
  return `${said.length === 0 ? row.label : `${row.label}: ${said.join(', ')}`}${after}`
}
