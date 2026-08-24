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
const ROWS = 'helix-table-row, helix-headless-table-row, [role="row"]'
const CELLS =
  'helix-table-cell, helix-headless-table-cell, [role="cell"], [role="gridcell"], [role="rowheader"]'
const COLUMNS = 'helix-table-column, helix-headless-table-column, [role="columnheader"]'

/** Whether an element is a grid rather than a document table. */
const isGrid = (element: Element): boolean =>
  element.getAttribute('role') === 'table' ||
  element.getAttribute('role') === 'grid' ||
  /^helix-(headless-)?table$/i.test(element.tagName)

/**
 * Reads a grid built from roles rather than from table markup.
 *
 * The shape is the same question asked of different elements: a first row of
 * column headers naming the series, a first cell per row labeling it, and
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

/* A column with no numbers in it is not a series.
 *
 * Both readers build one entry per data column and then drop the rows whose
 * cells will not parse, so a column of notes came back as a series with a name
 * and no points. Nothing drew it, which is why it went unseen, and `Legend`
 * named it anyway: a swatch in the palette against a column no chart plotted,
 * and every series after it shifted a color.
 *
 * Found the moment tables grew columns a tooltip wanted and a drawing did not,
 * which is the arrangement `readRows` exists for. */
const plotted = (series: Series[]): Series[] => series.filter((one) => one.points.length > 0)

export const readSeries = (table: Element): Series[] => {
  if (isGrid(table)) {
    return plotted(readGrid(table))
  }
  const element = table as HTMLTableElement
  const names = [...(element.tHead?.rows[0]?.cells ?? [])]
    .slice(1)
    .map((cell) => cell.textContent?.trim() ?? '')
  const rows = [...(element.tBodies[0]?.rows ?? [])]
  const columns = Math.max(0, ...rows.map((row) => row.cells.length - 1))

  return plotted(
    Array.from({ length: columns }, (_, column) => ({
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
    })),
  )
}

/** One cell of a row, as a reader sees it and as a chart measures it. */
export interface RowCell {
  /**
   * The column's name, from the header.
   */
  name: string
  /**
   * The cell's own text, which is what a reader sees.
   */
  text: string
  /**
   * The number behind it, where there is one.
   */
  value?: number
}

/** One row of a table, headed and with every cell in it. */
export interface Row {
  /**
   * Every cell in the row, in order, numeric or not.
   */
  cells: RowCell[]
  /**
   * The row's own label, from its header cell.
   */
  label: string
  /**
   * The machine-readable instant, if the row header carries a `<time>`.
   */
  when?: string
}

/**
 * Reads a table as rows rather than as columns.
 *
 * **Everything `readSeries` throws away on purpose, a tooltip needs.** That
 * function answers "what should I draw", so it keeps the parsed number and
 * discards the cell's text, and it drops a column whose cells are not numbers
 * at all. A chart drawing `128000` and a tooltip saying `128000` would be the
 * chart overruling the table, which already decided that number reads `$128k`;
 * and a column of notes beside the figures is exactly the extra a reader wants
 * when their pointer is resting on a reading.
 *
 * So this keeps both, and keeps the columns nothing plotted. A chart of two
 * series over a table of four columns still has four columns to show.
 *
 * The traversal is the same shape as `readSeries` and deliberately separate.
 * Folding them into one pass returning both would make every caller who wants
 * one build the other, and the two are asked for at different moments: series
 * on render, rows only where a pointer has stopped.
 */
export const readRows = (table: Element): Row[] => {
  const cell = (name: string, element: Element | undefined): RowCell | undefined => {
    if (!element) {
      return undefined
    }
    const text = element.textContent?.trim() ?? ''
    const raw = (element as HTMLElement).dataset?.value ?? text
    const value = Number(raw.trim())
    return {
      name,
      text,
      ...(Number.isFinite(value) && raw.trim() !== '' ? { value } : {}),
    }
  }

  const row = (head: Element | undefined, rest: Element[], names: string[]): Row => {
    const when = head?.querySelector('time')?.getAttribute('datetime')
    return {
      cells: rest
        .map((one, index) => cell(names[index] ?? '', one))
        .filter((one): one is RowCell => one !== undefined),
      label: head?.textContent?.trim() ?? '',
      ...(when ? { when } : {}),
    }
  }

  if (isGrid(table)) {
    const names = [...table.querySelectorAll(COLUMNS)]
      .slice(1)
      .map((one) => one.textContent?.trim() ?? '')
    return [...table.querySelectorAll(ROWS)].map((one) => {
      const cells = [...one.querySelectorAll(CELLS)]
      return row(cells[0], cells.slice(1), names)
    })
  }

  const element = table as HTMLTableElement
  const names = [...(element.tHead?.rows[0]?.cells ?? [])]
    .slice(1)
    .map((one) => one.textContent?.trim() ?? '')
  return [...(element.tBodies[0]?.rows ?? [])].map((one) =>
    row(one.cells[0], [...one.cells].slice(1), names),
  )
}
