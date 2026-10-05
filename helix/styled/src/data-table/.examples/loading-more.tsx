import { useState } from 'react'

const batch = (from: number) =>
  Array.from({ length: 6 }, (_, index) => ({
    date: `September ${30 - from - index}, 2026`,
    notes: index % 2 === 0 ? 'Fixes' : 'Features and fixes',
    version: `2.${24 - from - index}.0`,
  }))

export function Example() {
  const [rows, setRows] = useState(() => batch(0))

  /* `load-more` draws the last row and its button, which sends
     `helix-load-more`. `row-header` makes each version name its row for a
     screen reader. Typing a version's first digits moves to it. */
  const loadMore = () => {
    setRows((before) => [...before, ...batch(before.length)])
  }

  return (
    <helix-data-table
      label="Releases"
      load-more={rows.length < 24}
      onhelix-load-more={loadMore}
      row-key="version"
      rows={rows}
    >
      <helix-table-column field="date">Date</helix-table-column>
      <helix-table-column
        field="version"
        row-header
      >
        Version
      </helix-table-column>
      <helix-table-column field="notes">Notes</helix-table-column>
    </helix-data-table>
  )
}
