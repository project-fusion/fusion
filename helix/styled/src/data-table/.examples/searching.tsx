import { useState } from 'react'

const rows = [
  { location: 'Lisbon', name: 'Ada Okonjo', team: 'Platform' },
  { location: 'Berlin', name: 'Bo Lindqvist', team: 'Design' },
  { location: 'Lisbon', name: 'Chen Wei', team: 'Platform' },
  { location: 'Toronto', name: 'Dara Ellis', team: 'Research' },
  { location: 'Berlin', name: 'Emil Novak', team: 'Design' },
]

export function Example() {
  const [filter, setFilter] = useState('')

  return (
    <helix-data-table
      filter={filter}
      label="People"
      rows={rows}
    >
      {/* The page keeps the query and passes it back as `filter`. Refuse the
          change to run the search on a server. */}
      <helix-input
        onhelix-before-change={(event) => setFilter(event.detail.value)}
        placeholder="Search"
        slot="toolbar"
        type="search"
      />

      <helix-table-column
        field="name"
        sortable
        width="12rem"
      >
        Name
      </helix-table-column>
      <helix-table-column
        field="team"
        sortable
      >
        Team
      </helix-table-column>
      <helix-table-column field="location">Location</helix-table-column>
    </helix-data-table>
  )
}
