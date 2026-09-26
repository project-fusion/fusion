import { useState } from 'react'

export function Example() {
  /* `collapsed` names the collapsed side: `'end' | 'start' | undefined`. Both
     events carry a string, so the collapse handler turns `''` into `undefined`. */
  const [collapsed, setCollapsed] = useState<'end' | 'start' | undefined>('start')
  const [position, setPosition] = useState(35)

  return (
    <helix-splitter
      collapsed={collapsed}
      onhelix-before-collapse={(event) => {
        const side = event.detail.value
        setCollapsed(side === 'start' || side === 'end' ? side : undefined)
      }}
      onhelix-before-resize={(event) => setPosition(Number(event.detail.value))}
      position={position}
    >
      <div slot="start">Inbox, Drafts, Sent, and Archive</div>
      <div slot="end">Select a message to read it.</div>
    </helix-splitter>
  )
}
