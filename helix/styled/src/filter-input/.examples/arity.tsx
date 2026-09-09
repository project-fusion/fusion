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
      hint="Assignee offers is empty, which takes no values at all"
      label="Filter the queue"
      onhelix-facet={(event) => {
        const { arity, field, label, operatorLabel, values } = event.detail
        setChips((held) => {
          const rest = held.filter((chip) => chip.field !== field)
          /* `arity` is what tells an empty filter from no filter: a comparison
           that takes none is filtering, and will never have values to show. */
          return values.length === 0 && arity !== 'none'
            ? rest
            : [...rest, { field, label, operatorLabel, values }]
        })
      }}
      placeholder="Search, or pick a filter"
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

        {/* `one`: pressing another value replaces it rather than adding. */}
        <helix-filter-field
          label="Created"
          name="created"
        >
          <helix-filter-operator
            arity="one"
            label="is after"
            name="after"
          ></helix-filter-operator>
          <helix-option value="today">Today</helix-option>
          <helix-option value="week">This week</helix-option>
          <helix-option value="month">This month</helix-option>
        </helix-filter-field>

        {/* `none`: the comparison is the whole filter, so no values are offered. */}
        <helix-filter-field
          label="Assignee"
          name="assignee"
        >
          <helix-filter-operator
            default
            label="is any of"
            name="any"
          ></helix-filter-operator>
          <helix-filter-operator
            arity="none"
            label="is empty"
            name="empty"
          ></helix-filter-operator>
          <helix-option value="ada">Ada</helix-option>
          <helix-option value="grace">Grace</helix-option>
        </helix-filter-field>
      </helix-filter-menu>

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
