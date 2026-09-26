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
        A summary of your account activity.
      </helix-tab-panel>
      <helix-tab-panel
        slot="panels"
        value="usage"
      >
        Requests, storage, and bandwidth.
      </helix-tab-panel>
    </helix-tabs>
  )
}
