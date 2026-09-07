import { useState } from 'react'

const START = ['design', 'infra', 'docs']

export function Example() {
  const [tags, setTags] = useState(START)

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      {/* The consumer removes the tag, because the consumer owns it. The field
          asks, whether the reader pressed the close control or Backspace, and
          both arrive here as one `helix-dismiss`. */}
      <helix-filter-input
        hint="Type to narrow, or press Backspace on an empty field to take the last one off"
        label="Filter rows"
        onhelix-dismiss={(event) => {
          setTags((held) => held.filter((label) => label !== event.detail.label))
        }}
        placeholder="Add a filter"
      >
        {tags.map((label) => (
          <helix-tag
            dismissible
            key={label}
            slot="tags"
          >
            {label}
          </helix-tag>
        ))}
      </helix-filter-input>

      <helix-button onClick={() => setTags(START)}>Replay</helix-button>
    </helix-flex>
  )
}
