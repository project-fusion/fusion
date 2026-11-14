import { useState } from 'react'

export function Example() {
  const [open, setOpen] = useState(true)

  return (
    <helix-dialog
      label="Unsaved changes"
      onClose={() => setOpen(false)}
      open={open}
      persistent
    >
      <helix-text as="p">
        You have two unsaved changes. Save or discard them to continue.
      </helix-text>
      <helix-button-group
        label="Dialog actions"
        layout="spaced"
        slot="footer"
      >
        <helix-button onClick={() => setOpen(false)}>Discard changes</helix-button>
        <helix-button
          emphasis="solid"
          onClick={() => setOpen(false)}
          tone="primary"
        >
          Save changes
        </helix-button>
      </helix-button-group>
    </helix-dialog>
  )
}
