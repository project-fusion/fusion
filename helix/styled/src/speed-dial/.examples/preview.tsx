import { useState } from 'react'

export function Example() {
  const [open, setOpen] = useState(false)

  return (
    <helix-flex justify-content="end">
      <helix-speed-dial
        label="Actions"
        onToggle={(event: Event & { newState?: string }) => setOpen(event.newState === 'open')}
      >
        <helix-icon-button
          emphasis="solid"
          label="Actions"
          raised
          shape="circle"
          slot="trigger"
          style={{ '--icon-button-size': 'var(--helix-size-control-lg)' }}
          tone="primary"
        >
          <helix-icon
            name="plus"
            style={open ? { '--icon-rotate': '45deg' } : {}}
          ></helix-icon>
        </helix-icon-button>

        <helix-speed-dial-item value="share">
          Share
          <helix-icon
            name="share-network"
            slot="icon"
          ></helix-icon>
        </helix-speed-dial-item>
        <helix-speed-dial-item value="copy">
          Duplicate
          <helix-icon
            name="copy"
            slot="icon"
          ></helix-icon>
        </helix-speed-dial-item>
        <helix-speed-dial-item value="delete">
          Delete
          <helix-icon
            name="trash"
            slot="icon"
          ></helix-icon>
        </helix-speed-dial-item>
      </helix-speed-dial>
    </helix-flex>
  )
}
