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
    /* A token asks to go and does not go on its own, so a page that renders
       `dismissible` tokens and binds nothing has drawn a control that answers
       nothing. The consumer owns the markup the tokens are in, which is why the
       field asks rather than takes. Bound on the field, since `helix-dismiss`
       bubbles and is also what Backspace on an empty field sends: one handler,
       both ways of asking. */
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
