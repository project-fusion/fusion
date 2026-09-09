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
      hint="Open the picker, tick a value, and change the comparison under the field"
      label="Filter the queue"
      /* The chips are the consumer's own markup, which is why the picker
         announces rather than applies. Everything that can change a filter
         arrives here as one `helix-facet`: a tick, a comparison, and the X on a
         chip, which the field turns into this field being filtered by nothing.
         There is no `onhelix-dismiss` below for that reason. */
      onhelix-facet={(event) => {
        const { field, label, operatorLabel, values } = event.detail
        setChips((held) => {
          const rest = held.filter((chip) => chip.field !== field)
          // An empty set is the filter going, which is what unticking the last
          // value means by it, and what the X on a chip is answered with.
          return values.length === 0 ? rest : [...rest, { field, label, operatorLabel, values }]
        })
      }}
      placeholder="Search, or pick a filter"
    >
      {/* The picker goes before the text, which is where the reference puts it:
          a reader either types or reaches for the list, and both narrow the same
          set. */}
      <helix-filter-menu
        label="Filter"
        slot="start"
      >
        {/* The trigger is the consumer's, so the icon is too. `funnel-simple`
            is the three rules a reader already reads as "filter", and it sits in
            the button's own start slot rather than beside it. */}
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

        {/* No comparisons declared, so it is offered "is any of" and "is none
            of": the two the typed grammar can say, and the two nearly every set
            filter wants. They sit on a page of their own under the field,
            because a comparison is one choice and the values are several. */}
        <helix-filter-field
          label="Disposition"
          name="disposition"
        >
          <helix-option value="refunded">Refunded</helix-option>
          <helix-option value="chargeback">Chargeback</helix-option>
          <helix-option value="settled">Settled</helix-option>
        </helix-filter-field>

        {/* One comparison and no default, which is the scalar shape: there is
            nothing for a default to distinguish it from, so a chip built from
            this always says "after" and the field offers no comparison to
            change. */}
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
