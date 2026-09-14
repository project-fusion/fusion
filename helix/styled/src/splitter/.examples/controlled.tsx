import { useState } from 'react'

export function Example() {
  /* `collapsed` names a side rather than a state: `'end' | 'start' | undefined`.
     Both events carry a string, so the collapse handler turns `''`, which is
     neither pane, back into `undefined` before handing it over. */
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
      <div slot="start">Folded until the page says otherwise.</div>
      <div slot="end">The other side.</div>
    </helix-splitter>
  )
}
