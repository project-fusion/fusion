import { useState } from 'react'

export function Example() {
  const [open, setOpen] = useState(true)

  return (
    <>
      <helix-button
        emphasis="solid"
        onClick={() => setOpen(true)}
        tone="primary"
      >
        Delete project
      </helix-button>

      {/* The dialog starts open, so the preview shows it. */}
      <helix-dialog
        label="Delete project"
        onClose={() => setOpen(false)}
        open={open}
      >
        <helix-text
          as="h2"
          slot="header"
        >
          Delete project
        </helix-text>
        <helix-text>This removes the project and everything in it. It cannot be undone.</helix-text>
        <helix-button-group
          label="Dialog actions"
          layout="spaced"
          slot="footer"
        >
          <helix-button
            emphasis="solid"
            onClick={() => setOpen(false)}
            tone="danger"
          >
            Delete project
          </helix-button>
          <helix-button onClick={() => setOpen(false)}>Cancel</helix-button>
        </helix-button-group>
      </helix-dialog>
    </>
  )
}
