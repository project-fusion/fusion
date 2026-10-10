import { useState } from 'react'

const RESTING = 'Click the field and press / to filter the list.'

export function Example() {
  const [said, setSaid] = useState(RESTING)

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-text variant="body">
        Press <helix-kbd keys="mod+k" /> to search. The shortcut <helix-code>mod+k</helix-code>{' '}
        shows as ⌘K on a Mac and Ctrl+K on other computers.
      </helix-text>

      <helix-input
        aria-label="Filter"
        placeholder="Filter"
      >
        <helix-kbd
          keys="/"
          onhelix-shortcut={(event) => setSaid(`Heard ${event.detail.keys} inside the field.`)}
          slot="end"
          within="control"
        />
      </helix-input>

      <helix-text
        emphasis="muted"
        variant="caption"
      >
        {said}
      </helix-text>
    </helix-flex>
  )
}
