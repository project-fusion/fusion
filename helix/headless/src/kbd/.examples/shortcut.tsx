import './shortcut.css'

import { useState } from 'react'

const RESTING =
  'The second one binds as well as draws. Put the cursor in the field and press it: the key is listened for within the control it sits in, so it answers there and nowhere else.'

export function Example() {
  const [said, setSaid] = useState(RESTING)

  return (
    <div className="stack">
      <p>
        Press <helix-headless-kbd keys="mod+k" /> to search. Written once as <code>mod+k</code>: an
        Apple keyboard is told the Command glyph and every other keyboard is told Ctrl, so neither
        is asked for a key it does not have.
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
