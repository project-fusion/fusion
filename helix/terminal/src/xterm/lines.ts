/** One row of a terminal's buffer, as text, and whether it carries on the row above. */
export interface BufferRow {
  text: string
  /** Whether the row is the row above run past the grid's edge, which reads as one line. */
  wrapped: boolean
}

/**
 * Rows as the lines a reader would copy: a row that wraps joined to the one
 * above it, and the empty rows under the last line dropped, which are the
 * screen's unwritten space rather than anything the program wrote.
 */
export const linesOf = (rows: readonly BufferRow[]): string => {
  const lines: string[] = []
  for (const row of rows) {
    if (row.wrapped && lines.length > 0) {
      lines[lines.length - 1] += row.text
    } else {
      lines.push(row.text)
    }
  }
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop()
  }
  return lines.join('\n')
}
