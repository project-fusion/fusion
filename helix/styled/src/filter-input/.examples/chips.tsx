export function Example() {
  return (
    <helix-flex
      align-items="start"
      direction="column"
      gap="sm"
    >
      {/* The field's usual comparison, so no operator is shown between the name
          and the values. */}
      <helix-filter-chip
        dismiss-label="Remove the disposition filter"
        dismissible
        label="Disposition"
        name="disposition"
        operator="any"
      >
        refunded, chargeback
      </helix-filter-chip>

      {/* A comparison someone chose, so the operator is shown. */}
      <helix-filter-chip
        dismiss-label="Remove the category filter"
        dismissible
        label="Category"
        name="category"
        operator="none"
        operator-label="is none of"
      >
        Services
      </helix-filter-chip>

      {/* A date has no usual comparison, so its operator is always shown. */}
      <helix-filter-chip
        dismiss-label="Remove the created filter"
        dismissible
        label="Created"
        name="created"
        operator="after"
        operator-label="after"
      >
        Aug 1
      </helix-filter-chip>

      {/* Two chips on the same field are two filters. Your code decides how
          they combine. */}
      <helix-filter-chip
        dismiss-label="Remove the lower amount filter"
        dismissible
        label="Amount"
        name="amount"
        operator="above"
        operator-label="above"
      >
        100
      </helix-filter-chip>
    </helix-flex>
  )
}
