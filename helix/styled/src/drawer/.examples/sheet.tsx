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
        Open filters
      </helix-button>

      <helix-drawer
        label="Filters"
        onClose={() => setOpen(false)}
        open={open}
        placement="bottom"
        snap-points="0.5 1"
      >
        <span slot="header">Filters</span>
        <helix-text scale="body">
          Show projects by owner, status, and the date they last changed.
        </helix-text>
        <helix-button-group
          label="Filter actions"
          layout="spaced"
          slot="footer"
        >
          <helix-button onClick={() => setOpen(false)}>Clear</helix-button>
          <helix-button
            emphasis="solid"
            onClick={() => setOpen(false)}
            tone="primary"
          >
            Apply
          </helix-button>
        </helix-button-group>
      </helix-drawer>
    </>
  )
}
