import { useState } from 'react'

export function Example() {
  const [open, setOpen] = useState(true)

  return (
    <helix-dialog
      alert
      dismissible
      onClose={() => setOpen(false)}
      open={open}
    >
      <helix-text
        as="h2"
        slot="header"
      >
        Delete project
      </helix-text>
      <helix-text as="p">
        The project and its history are deleted for everyone on your team.
      </helix-text>
      <helix-button-group
        label="Dialog actions"
        layout="spaced"
        slot="footer"
      >
        <helix-button onClick={() => setOpen(false)}>Keep project</helix-button>
        <helix-button
          emphasis="solid"
          onClick={() => setOpen(false)}
          tone="danger"
        >
          Delete project
        </helix-button>
      </helix-button-group>
    </helix-dialog>
  )
}
