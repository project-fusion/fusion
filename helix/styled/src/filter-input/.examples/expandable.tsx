const TAGS = ['design', 'infra', 'docs', 'security', 'billing']

export function Example() {
  return (
    <helix-filter-input
      expandable
      hint="The count is a button here, so the two over the cap are reachable without leaving the field"
      label="Filter rows"
      max-tags="3"
      placeholder="Add a filter"
    >
      {TAGS.map((label) => (
        <helix-tag
          dismissible
          key={label}
          slot="tags"
        >
          {label}
        </helix-tag>
      ))}
    </helix-filter-input>
  )
}
