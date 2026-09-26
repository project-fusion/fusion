import { useState } from 'react'

const FILTERS = [
  { label: 'Owner', name: 'owner', value: 'Ada' },
  { label: 'Env', name: 'env', value: 'Staging' },
  { label: 'Status', name: 'status', value: 'Open' },
  { label: 'Area', name: 'area', value: 'Billing' },
]

export function Example() {
  const [filters, setFilters] = useState(FILTERS)

  return (
    /* A dismissible chip does not remove itself. One listener on the field removes the chip that
       sent `helix-dismiss`, which Backspace in an empty field also sends. */
    <helix-filter-input
      label="Filter rows"
      onhelix-dismiss={(event: CustomEvent) => {
        const name = (event.target as Element).getAttribute('name')
        setFilters((held) => held.filter((filter) => filter.name !== name))
      }}
      placeholder="Add a filter"
    >
      {filters.map((filter) => (
        <helix-filter-chip
          dismiss-label={`Remove the ${filter.label.toLowerCase()} filter`}
          dismissible
          key={filter.name}
          label={filter.label}
          name={filter.name}
          slot="tags"
        >
          {filter.value}
        </helix-filter-chip>
      ))}
    </helix-filter-input>
  )
}
