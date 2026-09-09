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
          /* `arity` is what tells an empty filter from no filter. Every other
             comparison with nothing chosen means the field is no longer
             narrowing anything; one that takes no values means it is, and always
             will have none to show. Without reading this the two arrive
             identical and "is empty" could never be drawn. */
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

        {/* The default pair, both `many`: tick as many as you like. */}
        <helix-filter-field
          label="Disposition"
          name="disposition"
        >
          <helix-option value="refunded">Refunded</helix-option>
          <helix-option value="chargeback">Chargeback</helix-option>
          <helix-option value="settled">Settled</helix-option>
        </helix-filter-field>

        {/* `one`, so the values are a single choice: pressing another replaces
            it rather than adding, and the rows announce as radios. A date is
            after one date or it is after another; it is not after both. */}
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

        {/* `none` beside `many`. Choosing "is empty" is the whole filter, so the
            picker stops offering names under it and the chip carries the word
            with no values after it. Choosing "is any of" again brings them
            back. */}
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
