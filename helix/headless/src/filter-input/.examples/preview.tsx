export function Example() {
  return (
    <helix-headless-filter-input
      label="Filter rows"
      placeholder="Add a filter"
    >
      <helix-headless-filter-chip
        dismissible
        label="Owner"
        name="owner"
        slot="tags"
      >
        Ada
      </helix-headless-filter-chip>
      <helix-headless-filter-chip
        dismissible
        label="Env"
        name="env"
        slot="tags"
      >
        Staging
      </helix-headless-filter-chip>
      <helix-headless-filter-chip
        dismissible
        label="Status"
        name="status"
        slot="tags"
      >
        Open
      </helix-headless-filter-chip>
      <helix-headless-filter-chip
        dismissible
        label="Area"
        name="area"
        slot="tags"
      >
        Billing
      </helix-headless-filter-chip>
    </helix-headless-filter-input>
  )
}
