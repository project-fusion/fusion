import { useState } from 'react'

export function Example() {
  const [active, setActive] = useState('usage')

  return (
    <helix-tabs
      active={active}
      onhelix-before-activate={(event) => setActive(event.detail.value)}
    >
      <helix-tab value="overview">Overview</helix-tab>
      <helix-tab value="usage">Usage</helix-tab>

      <helix-tab-panel
        slot="panels"
        value="overview"
      >
        What the account is doing.
      </helix-tab-panel>
      <helix-tab-panel
        slot="panels"
        value="usage"
      >
        Requests, storage and egress.
      </helix-tab-panel>
    </helix-tabs>
  )
}
