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
        /* Typed text, a tick in the menu and the X on a chip all arrive as one
         `helix-facet`, so nothing here knows which the reader used. */
        onhelix-facet={(event) => {
          const { field, label, operatorLabel, values } = event.detail
          setChips((held) => {
            const rest = held.filter((chip) => chip.field !== field)
            // An empty set is the filter going, which is what unticking the last
            // value in the menu means by it.
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

        {/* A field with no values to list belongs here rather than in the
            picker, where its page would have nothing on it to press. */}
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
