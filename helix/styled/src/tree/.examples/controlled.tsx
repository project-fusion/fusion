import { useState } from 'react'

export function Example() {
  const [active, setActive] = useState('engram')

  return (
    <helix-tree
      active={active}
      label="Mailboxes"
      onhelix-before-activate={(event) => setActive(event.detail.value)}
    >
      <helix-tree-item value="core">Inbox</helix-tree-item>
      <helix-tree-item value="engram">Drafts</helix-tree-item>
      <helix-tree-item value="trace">Sent</helix-tree-item>
    </helix-tree>
  )
}
