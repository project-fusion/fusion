import { useState } from 'react'

type Edge = 'bottom' | 'end' | 'start' | 'top'

export function Example() {
  const [open, setOpen] = useState<Edge>()

  return (
    <>
      <helix-flex gap="sm">
        <helix-button onClick={() => setOpen('start')}>Start</helix-button>
        <helix-button onClick={() => setOpen('end')}>End</helix-button>
        <helix-button onClick={() => setOpen('top')}>Top</helix-button>
        <helix-button onClick={() => setOpen('bottom')}>Bottom</helix-button>
      </helix-flex>

      <helix-drawer
        label="Menu"
        onClose={() => setOpen(undefined)}
        open={open === 'start'}
        placement="start"
      >
        <span slot="header">Menu</span>
        <helix-text scale="body">Browse your projects, files, and settings.</helix-text>
      </helix-drawer>

      <helix-drawer
        label="Details"
        onClose={() => setOpen(undefined)}
        open={open === 'end'}
        placement="end"
      >
        <span slot="header">Details</span>
        <helix-text scale="body">Review the details of the selected file.</helix-text>
      </helix-drawer>

      <helix-drawer
        label="Search"
        onClose={() => setOpen(undefined)}
        open={open === 'top'}
        placement="top"
      >
        <span slot="header">Search</span>
        <helix-text scale="body">Search projects, files, and people.</helix-text>
      </helix-drawer>

      <helix-drawer
        label="Share"
        onClose={() => setOpen(undefined)}
        open={open === 'bottom'}
        placement="bottom"
      >
        <span slot="header">Share</span>
        <helix-text scale="body">Share a link to the project with your team.</helix-text>
      </helix-drawer>
    </>
  )
}
