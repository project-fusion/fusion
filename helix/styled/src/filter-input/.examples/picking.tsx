import { useState } from 'react'

interface Chip {
  field: string
  label: string
  operatorLabel: string
  values: readonly string[]
}

export function Example() {
  const [chips, setChips] = useState<Chip[]>([])

  return (
    <helix-filter-input
      hint="Pick a filter and its values, or type one such as disposition:refunded, -disposition:settled, or refund assignee:ada tuesday"
      label="Filter the queue"
      /* Typed text, a checked value, a changed comparison, and a removed chip
         all send `helix-facet`, so no `onhelix-dismiss` handler is needed.
         Typing also checks the value in the menu. */
      onhelix-facet={(event) => {
        const { field, label, operatorLabel, values } = event.detail
        setChips((held) => {
          const rest = held.filter((chip) => chip.field !== field)
          return values.length === 0 ? rest : [...rest, { field, label, operatorLabel, values }]
        })
      }}
      placeholder="Search, or pick or type a filter"
    >
      <helix-filter-menu
        label="Filter"
        slot="start"
      >
        <helix-button
          emphasis="ghost"
          slot="trigger"
        >
          <helix-icon
            name="funnel-simple"
            slot="start"
          ></helix-icon>
          Filter
        </helix-button>

        <helix-filter-field
          label="Disposition"
          name="disposition"
        >
          <helix-option value="refunded">Refunded</helix-option>
          <helix-option value="chargeback">Chargeback</helix-option>
          <helix-option value="settled">Settled</helix-option>
        </helix-filter-field>

        <helix-filter-field
          label="Created"
          name="created"
        >
          <helix-filter-operator
            label="after"
            name="after"
          ></helix-filter-operator>
          <helix-option value="today">Today</helix-option>
          <helix-option value="week">This week</helix-option>
        </helix-filter-field>
      </helix-filter-menu>

      {/* A field with no values to list goes here, outside the picker. */}
      <helix-filter-field
        label="Assignee"
        name="assignee"
      ></helix-filter-field>

      {chips.map((chip) => (
        <helix-filter-chip
          dismiss-label={`Remove the ${chip.label.toLowerCase()} filter`}
          dismissible
          key={chip.field}
          label={chip.label}
          name={chip.field}
          operator-label={chip.operatorLabel}
          slot="tags"
        >
          {chip.values.join(', ')}
        </helix-filter-chip>
      ))}
    </helix-filter-input>
  )
}
