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
        /* One handler for every way a filter can change. Enter over typed text,
           a tick in the menu and the X on a chip all arrive as `helix-facet`
           carrying the same detail, so nothing here knows or cares which of them
           the reader used — and typing a filter also ticks it in the menu,
           because there is one store and the field writes to it. */
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
        {/* The same declarations the picker reads, and the only ones. Neither
            field declares a comparison, so both are filtered by "is any of" and
            negated with a leading minus, which is what the punctuation can
            say. */}
        <helix-filter-menu
          label="Filter"
          slot="start"
        >
          {/* The trigger is the consumer's, so the icon is too.
              `funnel-simple` is the three rules a reader already reads as
              "filter", and it sits in the button's own start slot. */}
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

        {/* Declared on the field rather than in the picker, which is what a
            field with no values wants: `assignee:ada` is a filter and nobody had
            to list every name in the company, but there is also nothing for a
            menu to offer. Written here it can be typed and is not a dead page to
            open. */}
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
