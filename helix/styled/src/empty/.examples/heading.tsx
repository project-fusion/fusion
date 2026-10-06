export function Example() {
  return (
    <helix-empty
      heading="No matching invoices"
      heading-level={2}
      no-announce
    >
      <helix-icon
        name="magnifying-glass"
        slot="icon"
      ></helix-icon>
      Try a different date range, or clear the filters.
      <helix-button slot="actions">Clear filters</helix-button>
    </helix-empty>
  )
}
