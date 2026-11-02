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
        label="Edit project"
        onClose={() => setOpen(false)}
        open={open}
        size="full"
      >
        <helix-text
          as="h2"
          slot="header"
        >
          Edit project
        </helix-text>
        <helix-text>
          Update the project name, description, and members. Your changes apply to everyone on the
          team.
        </helix-text>
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
            Save changes
          </helix-button>
          <helix-button onClick={() => setOpen(false)}>Cancel</helix-button>
        </helix-button-group>
      </helix-dialog>
    </>
  )
}
