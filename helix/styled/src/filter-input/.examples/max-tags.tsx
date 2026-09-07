const TAGS = ['design', 'infra', 'docs', 'security', 'billing']

export function Example() {
  return (
    <helix-filter-input
      hint="The two over the cap are hidden rather than dropped, and counted so the reader can see they are there"
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
