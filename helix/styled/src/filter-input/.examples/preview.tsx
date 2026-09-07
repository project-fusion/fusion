export function Example() {
  return (
    <helix-filter-input
      label="Filter rows"
      placeholder="Add a filter"
    >
      <helix-tag
        dismissible
        slot="tags"
      >
        <span slot="prefix">Owner</span>
        Ada
      </helix-tag>
      <helix-tag
        dismissible
        slot="tags"
      >
        <span slot="prefix">Env</span>
        Staging
      </helix-tag>
    </helix-filter-input>
  )
}
