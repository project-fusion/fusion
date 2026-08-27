import { useState } from 'react'

export function Example() {
  const [active, setActive] = useState('engram')

  return (
    <helix-tree
      active={active}
      label="Packages"
      onhelix-before-activate={(event) => setActive(event.detail.value)}
    >
      <helix-tree-item value="core">core</helix-tree-item>
      <helix-tree-item value="engram">engram</helix-tree-item>
      <helix-tree-item value="trace">trace</helix-tree-item>
    </helix-tree>
  )
}
