import { useState } from 'react'

export function Example() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <helix-button
        emphasis="solid"
        onClick={() => setOpen(true)}
        tone="primary"
      >
        Open dialog
      </helix-button>

      <helix-dialog
        label="Archive project?"
        onClose={() => setOpen(false)}
        open={open}
        size="sm"
      >
        <helix-text
          as="h2"
          slot="header"
        >
          Archive project?
        </helix-text>
        <helix-text>The project becomes read-only for everyone on the team.</helix-text>
        <helix-button-group
          label="Dialog actions"
          layout="spaced"
          slot="footer"
        >
          <helix-button
            emphasis="solid"
            onClick={() => setOpen(false)}
            tone="primary"
          >
            Archive project
          </helix-button>
          <helix-button onClick={() => setOpen(false)}>Cancel</helix-button>
        </helix-button-group>
      </helix-dialog>
    </>
  )
}
