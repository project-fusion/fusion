import { useState } from 'react'

const START = ['design', 'infra', 'docs']

export function Example() {
  const [tags, setTags] = useState(START)

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      {/* Your code removes the tag. The remove button and Backspace both send
          `helix-dismiss`. */}
      <helix-filter-input
        hint="Press Backspace in the empty field to remove the last filter"
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
