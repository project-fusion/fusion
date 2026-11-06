import { useState } from 'react'

export function Example() {
  const [open, setOpen] = useState(false)

  return (
    <helix-popover
      label="Project details"
      onhelix-before-close={() => setOpen(false)}
      onhelix-before-open={() => setOpen(true)}
      open={open}
      style={{ '--popover-inline-size': '20rem' }}
    >
      <helix-button slot="trigger">Project details</helix-button>
      <helix-flex
        direction="column"
        gap="md"
      >
        <helix-text scale="body">
          The project has 12 members and 48 files. It was last updated on September 15, 2026.
        </helix-text>
        <helix-flex justify-content="end">
          <helix-button
            emphasis="outlined"
            onClick={() => setOpen(false)}
          >
            Close
          </helix-button>
        </helix-flex>
      </helix-flex>
    </helix-popover>
  )
}
