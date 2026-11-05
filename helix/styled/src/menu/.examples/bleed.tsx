import type { HelixMenu } from '@fusion.dev/helix'
import { useEffect, useRef } from 'react'

export function Example() {
  const menu = useRef<HelixMenu>(null)

  /* Opened, which reaches its first row: the ring a keyboard draws shows where
     the row's fill would be. */
  useEffect(() => {
    menu.current?.show()
  }, [])

  return (
    <helix-menu
      label="File"
      ref={menu}
    >
      <helix-button slot="trigger">File</helix-button>
      <helix-menu-item value="new">New file</helix-menu-item>
      <helix-menu-item value="open">Open…</helix-menu-item>
      <helix-divider></helix-divider>
      <helix-menu-item value="rename">Rename</helix-menu-item>
    </helix-menu>
  )
}
