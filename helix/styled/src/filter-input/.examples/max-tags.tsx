const TAGS = ['design', 'infra', 'docs', 'security', 'billing']

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-filter-input
        hint="Filters over the limit are shown as a count"
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

      <helix-filter-input
        expandable
        hint="Press the count to show every filter"
        label="Filter issues"
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
    </helix-flex>
  )
}
