import { useState } from 'react'

export function Example() {
  /* `collapsed` names a side rather than a state: `'end' | 'start' | undefined`.
     The markup twin writes the attribute bare, which is the empty string, so
     that is what this seeds with. A boolean is a different value and the
     splitter opened where the markup one stayed shut. */
  const [collapsed, setCollapsed] = useState<'' | 'end' | 'start'>('')
  const [position, setPosition] = useState(35)

  return (
    <helix-splitter
      collapsed={collapsed}
      onhelix-before-resize={(event) => {
        setPosition(event.detail.position)
        setCollapsed(event.detail.collapsed)
      }}
      position={position}
    >
      <div slot="start">Folded until the page says otherwise.</div>
      <div slot="end">The other side.</div>
    </helix-splitter>
  )
}
