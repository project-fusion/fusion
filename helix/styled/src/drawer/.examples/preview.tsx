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
        Open drawer
      </helix-button>

      <helix-drawer
        label="Project details"
        onClose={() => setOpen(false)}
        open={open}
        placement="end"
      >
        <span slot="header">Project details</span>
        <helix-flex
          align-items="start"
          direction="column"
          gap="md"
        >
          <helix-text scale="body">
            See who owns the project, who can edit it, and when it last changed.
          </helix-text>
          <helix-button
            emphasis="solid"
            onClick={() => setOpen(false)}
            tone="primary"
          >
            Close
          </helix-button>
        </helix-flex>
      </helix-drawer>
    </>
  )
}
