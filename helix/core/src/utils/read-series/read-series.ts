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
/* A grid's own rows and cells, by role and by tag.
 *
 * **Both, because `helix-table` sets its roles through `ElementInternals`.**
 * That writes no attribute at all, which is the whole point of it: the
 * semantics reach the accessibility tree and never the DOM. So a selector of
 * `[role="row"]` matches a hand-rolled grid and matches nothing at all in this
 * library's own table, and a selector of the tag matches ours and nothing
 * anybody else builds. Neither alone is the answer. */
const ROWS = 'helix-table-row, helix-base-table-row, [role="row"]'
const CELLS =
  'helix-table-cell, helix-base-table-cell, [role="cell"], [role="gridcell"], [role="rowheader"]'
const COLUMNS = 'helix-table-column, helix-base-table-column, [role="columnheader"]'

/** Whether an element is a grid rather than a document table. */
const isGrid = (element: Element): boolean =>
  element.getAttribute('role') === 'table' ||
  element.getAttribute('role') === 'grid' ||
  /^helix-(base-)?table$/i.test(element.tagName)

/**
 * Reads a grid built from roles rather than from table markup.
 *
 * The shape is the same question asked of different elements: a first row of
 * column headers naming the series, a first cell per row labelling it, and
 * numbers in the rest. `helix-table` puts its columns beside its rows rather
 * than inside a header row, so the columns are looked for in the whole grid and
 * the rows are read separately.
 *
 * **A paginated grid reads as the page it is showing.** That is worth knowing
 * before pointing a chart at one: a table element holds every row it has, and a
 * grid may be holding twenty of two thousand. The chart is not wrong, the
 * question was.
 */
const readGrid = (grid: Element): Series[] => {
  const columns = [...grid.querySelectorAll(COLUMNS)]
  const rows = [...grid.querySelectorAll(ROWS)]
  const names = columns.slice(1).map((cell) => cell.textContent?.trim() ?? '')
  const cellsOf = (row: Element): Element[] => [...row.querySelectorAll(CELLS)]
  const count = Math.max(0, ...rows.map((row) => cellsOf(row).length - 1))

  return Array.from({ length: count }, (_, column) => ({
    name: names[column] ?? grid.getAttribute('label') ?? '',
    points: rows.flatMap((row) => {
      const cells = cellsOf(row)
      const head = cells[0]
      const cell = cells[column + 1]
      if (!cell) {
        return []
      }
      const raw = (cell as HTMLElement).dataset?.value ?? cell.textContent ?? ''
      const value = Number(raw.trim())
      const when = head?.querySelector('time')?.getAttribute('datetime')
      return Number.isFinite(value) && raw.trim() !== ''
        ? [{ label: head?.textContent?.trim() ?? '', value, ...(when ? { when } : {}) }]
        : []
    }),
  }))
}

export const readSeries = (table: Element): Series[] => {
  if (isGrid(table)) {
    return readGrid(table)
  }
  const element = table as HTMLTableElement
  const names = [...(element.tHead?.rows[0]?.cells ?? [])]
    .slice(1)
    .map((cell) => cell.textContent?.trim() ?? '')
  const rows = [...(element.tBodies[0]?.rows ?? [])]
  const columns = Math.max(0, ...rows.map((row) => row.cells.length - 1))

  return Array.from({ length: columns }, (_, column) => ({
    name: names[column] ?? element.caption?.textContent?.trim() ?? '',
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
