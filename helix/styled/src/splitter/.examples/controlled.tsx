import { useState } from 'react'

export function Example() {
  const [collapsed, setCollapsed] = useState(true)
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
