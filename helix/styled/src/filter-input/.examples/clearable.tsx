export function Example() {
  return (
    <helix-filter-input
      clearable
      hint="Clearing the search text keeps the filters"
      label="Filter rows"
      value="deploy"
    >
      <helix-filter-chip
        dismiss-label="Remove the env filter"
        dismissible
        label="Env"
        name="env"
        slot="tags"
      >
        Staging
      </helix-filter-chip>
    </helix-filter-input>
  )
}
