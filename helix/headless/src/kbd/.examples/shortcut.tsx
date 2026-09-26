import './shortcut.css'

import { useState } from 'react'

const RESTING = 'Click the field and press / to filter the list.'

export function Example() {
  const [said, setSaid] = useState(RESTING)

  return (
    <div className="stack">
      <p>
        Press <helix-headless-kbd keys="mod+k" /> to search. The shortcut <code>mod+k</code> shows
        as ⌘K on a Mac and Ctrl+K on other computers.
      </p>

      <helix-headless-input
        aria-label="Filter"
        placeholder="Filter"
      >
        <helix-headless-kbd
          keys="/"
          onhelix-shortcut={(event) => setSaid(`Heard ${event.detail.keys} inside the field.`)}
          slot="end"
          within="control"
        />
      </helix-headless-input>

      <p className="caption">{said}</p>
    </div>
  )
}
