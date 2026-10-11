import type { HelixDeviceScreen } from '@fusion.dev/helix'
import { useRef } from 'react'
import './agent.css'

export function Example() {
  const phone = useRef<HelixDeviceScreen>(null)

  /* Call these as your agent's touches arrive, in the device's units. */
  return (
    <div className="layout">
      <helix-device-screen
        label="iPhone 17 Pro"
        readonly
        ref={phone}
        screen-height="874"
        screen-width="402"
      >
        <div className="stand-in">
          <span className="date">Saturday, October 10</span>
          <span className="time">9:41</span>
        </div>
      </helix-device-screen>

      <helix-flex
        align-items="start"
        direction="column"
        gap="sm"
      >
        <helix-button onClick={() => phone.current?.showTap(201, 437)}>Tap the middle</helix-button>
        <helix-button onClick={() => phone.current?.showSwipe(201, 860, 201, 500, 400)}>
          Swipe up from the bottom
        </helix-button>
      </helix-flex>
    </div>
  )
}
