const rows = [
  { id: 'v2-4', name: 'Version 2.4', state: 'Shipped' },
  { id: 'v2-5', name: 'Version 2.5', state: 'In review' },
]

const notes = (row: Readonly<Record<string, unknown>>) => {
  const link = document.createElement('a')
  link.href = `#${String(row.id)}`
  link.textContent = 'Read the notes'
  return link
}

const state = (row: Readonly<Record<string, unknown>>) => {
  const tag = document.createElement('helix-tag')
  tag.textContent = String(row.state)
  return tag
}

export function Example() {
  return (
    <helix-data-table
      label="Releases"
      reorderable-rows
      row-key="id"
      rows={rows}
    >
      <helix-table-column field="name">Release</helix-table-column>
      <helix-table-column
        cell={notes}
        field="notes"
      >
        Notes
      </helix-table-column>
      <helix-table-column
        cell={state}
        field="state"
      >
        State
      </helix-table-column>
    </helix-data-table>
  )
}
