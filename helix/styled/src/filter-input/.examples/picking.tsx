export function Example() {
  return (
    <helix-filter-input
      label="Filter the queue"
      placeholder="Search, or pick a filter"
    >
      {/* The picker goes before the text, which is where the reference puts it:
          a reader either types or reaches for the list, and both narrow the same
          set. */}
      <helix-filter-menu
        label="Filter"
        slot="start"
      >
        <helix-button
          emphasis="ghost"
          slot="trigger"
        >
          Filter
        </helix-button>

        {/* No comparisons declared, so it is offered "is any of" and "is none
            of": the two the typed grammar can say, and the two nearly every set
            filter wants. Declaring one replaces both. */}
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
            this always says "after". Declaring it also means there is no `none`
            for a leading minus to ask for, so this field is built here and not
            typed. */}
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

      {/* The chips are the consumer's own markup, which is why the picker
          announces rather than applies. These two are what the picker would have
          produced: the first drawn with the field's usual comparison, so it is
          unwritten, and the second with one somebody chose, so it shows. */}
      <helix-filter-chip
        dismiss-label="Remove the disposition filter"
        dismissible
        label="Disposition"
        name="disposition"
        operator="any"
        slot="tags"
      >
        refunded, chargeback
      </helix-filter-chip>

      <helix-filter-chip
        dismiss-label="Remove the created filter"
        dismissible
        label="Created"
        name="created"
        operator="after"
        operator-label="after"
        slot="tags"
      >
        Today
      </helix-filter-chip>
    </helix-filter-input>
  )
}
