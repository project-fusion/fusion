import { useState } from 'react'

export function Example() {
  const [open, setOpen] = useState(true)

  return (
    <helix-popover
      label="What is new"
      onhelix-before-close={() => setOpen(false)}
      onhelix-before-open={() => setOpen(true)}
      open={open}
      style={{ '--popover-inline-size': '20rem' }}
    >
      <helix-button slot="trigger">What is new</helix-button>
      <helix-flex
        direction="column"
        gap="md"
      >
        <helix-text scale="body">
          You can now share folders. Files you add to a folder later are shared too.
        </helix-text>
        <helix-flex justify-content="end">
          <helix-button
            emphasis="outlined"
            onClick={() => setOpen(false)}
          >
            Got it
          </helix-button>
        </helix-flex>
      </helix-flex>
    </helix-popover>
  )
}
