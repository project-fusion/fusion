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

      <div slot="panels">
        <helix-tab-panel value="overview">What the account is doing.</helix-tab-panel>
        <helix-tab-panel value="usage">Requests, storage and egress.</helix-tab-panel>
      </div>
    </helix-tabs>
  )
}
