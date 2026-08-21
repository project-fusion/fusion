/** One point in a series: what it is called, what it is worth, and when. */
export interface SeriesPoint {
  /**
   * The row's own label, taken from its header cell.
   */
  label: string
  /**
   * The number the cell holds.
   */
  value: number
  /**
   * The machine-readable instant, if the row header carries a `<time>`.
   */
  when?: string
}

/** One column of a table, read as a series. */
export interface Series {
  /**
   * The column's name, from the header row, or the table's caption where the
   * table has one column and therefore one series to name.
   */
  name: string
  /**
   * The rows, in the order the table gives them.
   */
  points: SeriesPoint[]
}

/**
 * Reads a table as series, one per data column.
 *
 * **The table is the chart's accessible representation, not a fallback for
 * one.** Every chart here takes its numbers from real markup rather than from a
 * property, so the page is readable with no script at all, sortable by anything
 * that sorts tables, and correct in a screen reader without a parallel
 * description that has to be kept in step by hand. A `values` array would be
 * easier to pass and would make the accessible version the thing nobody
 * maintains.
 *
 * The shape is the ordinary one: a header row naming the series, a first column
 * of row headers, and numbers in the rest. A single-column table has one series
 * and takes its name from the caption, since a header row of one is usually
 * absent.
 *
 * `data-value` wins over the cell's text, because `$1.2k` is what a reader
 * should see and is not a number. `Number()` rather than `parseFloat`, because
 * the second reads `12abc` as 12: a value that is nearly a number is a mistake
 * worth dropping rather than rounding off, and a dropped point is visible where
 * a silently truncated one is not.
 */
export const readSeries = (table: HTMLTableElement): Series[] => {
  const names = [...(table.tHead?.rows[0]?.cells ?? [])]
    .slice(1)
    .map((cell) => cell.textContent?.trim() ?? '')
  const rows = [...(table.tBodies[0]?.rows ?? [])]
  const columns = Math.max(0, ...rows.map((row) => row.cells.length - 1))

  return Array.from({ length: columns }, (_, column) => ({
    name: names[column] ?? table.caption?.textContent?.trim() ?? '',
    points: rows.flatMap((row) => {
      const head = row.cells[0]
      const cell = row.cells[column + 1]
      if (!cell) {
        return []
      }
      const raw = cell.dataset.value ?? cell.textContent ?? ''
      const value = Number(raw.trim())
      const when = head?.querySelector('time')?.getAttribute('datetime')
      return Number.isFinite(value) && raw.trim() !== ''
        ? [{ label: head?.textContent?.trim() ?? '', value, ...(when ? { when } : {}) }]
        : []
    }),
  }))
}
