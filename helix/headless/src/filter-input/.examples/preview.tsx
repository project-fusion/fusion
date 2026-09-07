export function Example() {
  return (
    <helix-headless-filter-input
      label="Filter rows"
      placeholder="Add a filter"
    >
      <helix-headless-tag
        dismissible
        slot="tags"
      >
        <span slot="prefix">Owner</span>
        Ada
      </helix-headless-tag>
      <helix-headless-tag
        dismissible
        slot="tags"
      >
        <span slot="prefix">Env</span>
        Staging
      </helix-headless-tag>
    </helix-headless-filter-input>
  )
}
