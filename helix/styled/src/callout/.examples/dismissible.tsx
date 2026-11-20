import { useState } from 'react'

export function Example() {
  const [open, setOpen] = useState(true)

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-callout
        dismissible
        onhelix-dismiss={() => setOpen(false)}
        open={open}
        tone="neutral"
      >
        <helix-text slot="heading">Tip</helix-text>
        Press the slash key to search from anywhere.
      </helix-callout>
      <helix-flex gap="sm">
        <helix-button>Open settings</helix-button>
        <helix-button
          emphasis="ghost"
          onClick={() => setOpen(true)}
        >
          Show tip
        </helix-button>
      </helix-flex>
    </helix-flex>
  )
}
