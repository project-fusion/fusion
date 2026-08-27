import { useState } from 'react'

const RESTING =
  'The second one binds as well as draws. Put the cursor in the field and press it: the key is listened for within the control it sits in, so it answers there and nowhere else.'

export function Example() {
  const [said, setSaid] = useState(RESTING)

  return (
    <helix-flex direction="column" gap="md">
      <helix-text variant="body">
        Press <helix-kbd keys="mod+k" /> to search. Written once as <code>mod+k</code>: an Apple
        keyboard is told the Command glyph and every other keyboard is told Ctrl, so neither is
        asked for a key it does not have.
      </helix-text>

      <helix-input aria-label="Filter" placeholder="Filter">
        <helix-kbd
          keys="/"
          onhelix-shortcut={(event) => setSaid(`Heard ${event.detail.keys} inside the field.`)}
          slot="end"
          within="control"
        />
      </helix-input>

      <helix-text tone="subtle" variant="caption">
        {said}
      </helix-text>
    </helix-flex>
  )
}
