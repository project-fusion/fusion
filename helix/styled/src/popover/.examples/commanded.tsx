import { useState } from 'react'

export function Example() {
  const [open, setOpen] = useState(false)

  return (
    <helix-popover
      label="Filters"
      onhelix-before-close={() => setOpen(false)}
      onhelix-before-open={() => setOpen(true)}
      open={open}
      placement="bottom-end"
    >
      <helix-button
        emphasis="solid"
        slot="trigger"
        tone="primary"
      >
        Filters
      </helix-button>
      <helix-checkbox-group label="Status">
        <helix-checkbox
          label="Open"
          name="status"
          value="open"
        ></helix-checkbox>
        <helix-checkbox
          label="Merged"
          name="status"
          value="merged"
        ></helix-checkbox>
      </helix-checkbox-group>
    </helix-popover>
  )
}
