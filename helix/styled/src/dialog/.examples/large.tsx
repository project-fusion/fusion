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
        label="Edit profile"
        onClose={() => setOpen(false)}
        open={open}
        size="lg"
      >
        <helix-text
          as="h2"
          slot="header"
        >
          Edit profile
        </helix-text>
        <helix-text>
          Update your name, email address, and profile photo. Members of your workspace can see
          these details.
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
