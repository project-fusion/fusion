const TAGS = ['design', 'infra', 'docs', 'security', 'billing']

export function Example() {
  return (
    <helix-filter-input
      expandable
      hint="Press the count to show every filter"
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
