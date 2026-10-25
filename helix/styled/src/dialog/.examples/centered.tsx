import { useState } from 'react'
import './centered.css'

export function Example() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <helix-button
        emphasis="solid"
        onClick={() => setOpen(true)}
        tone="danger"
      >
        Discard changes
      </helix-button>

      <helix-dialog
        label="Discard changes"
        onClose={() => setOpen(false)}
        open={open}
        size="sm"
        text-align="center"
      >
        <helix-icon
          name="x-circle-fill"
          slot="icon"
        ></helix-icon>
        <helix-text
          as="h2"
          slot="header"
        >
          Discard changes?
        </helix-text>
        <helix-text>You have nine unsaved changes. If you close now, they will be lost.</helix-text>
        <helix-button-group
          label="Dialog actions"
          layout="spaced"
          slot="footer"
        >
          <helix-button
            emphasis="solid"
            tone="danger"
          >
            Discard changes
          </helix-button>
          <helix-button onClick={() => setOpen(false)}>Keep editing</helix-button>
        </helix-button-group>
      </helix-dialog>
    </>
  )
}
