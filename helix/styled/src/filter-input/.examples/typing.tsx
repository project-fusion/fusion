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
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-filter-input
        hint="Try disposition:refunded, -disposition:settled, or refund assignee:ada tuesday"
        label="Filter the queue"
        /* Typed text, a checked value, and a removed chip all send
           `helix-facet`. */
        onhelix-facet={(event) => {
          const { field, label, operatorLabel, values } = event.detail
          setChips((held) => {
            const rest = held.filter((chip) => chip.field !== field)
            // No values removes the filter, as when the last value in the menu is
            // unchecked.
            return values.length === 0 ? rest : [...rest, { field, label, operatorLabel, values }]
          })
        }}
        placeholder="Search, or type a filter"
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
    </helix-flex>
  )
}
