import type {
  HelixDeviceButtonEvent,
  HelixDeviceKeyEvent,
  HelixDeviceScreen,
  HelixDeviceSwipeEvent,
  HelixDeviceTapEvent,
} from '@fusion.dev/helix'
import { useRef, useState } from 'react'
import './events.css'

// The log keeps this many of the most recent rows.
const KEEP = 6

const point = (x: number, y: number) => `${Math.round(x)}, ${Math.round(y)}`

export function Example() {
  const phone = useRef<HelixDeviceScreen>(null)
  const [rows, setRows] = useState<Array<{ carried: string; id: number; name: string }>>([])
  const next = useRef(0)

  /* The screen sends events and your code drives the device. Call your
     simulator or emulator here. The preview writes each event in the log. */
  const say = (name: string, carried: string) => {
    next.current += 1
    const id = next.current
    setRows((all) => [...all, { carried, id, name }].slice(-KEEP))
  }

  const tapped = (event: HelixDeviceTapEvent) => {
    const { duration, x, y } = event.detail
    phone.current?.showTap(x, y)
    say('helix-device-tap', `${point(x, y)} for ${duration} ms`)
  }

  const swiped = (event: HelixDeviceSwipeEvent) => {
    const { fromX, fromY, toX, toY } = event.detail
    say('helix-device-swipe', `${point(fromX, fromY)} to ${point(toX, toY)}`)
  }

  const keyed = (event: HelixDeviceKeyEvent) => {
    if (event.detail.phase === 'down') {
      say('helix-device-key', event.detail.code)
    }
  }

  const pressed = (event: HelixDeviceButtonEvent) => {
    say('helix-device-button', event.detail.button)
  }

  return (
    <div className="layout">
      <helix-device-screen
        controls="back home recents screenshot"
        label="Pixel 9"
        onhelix-device-button={pressed}
        onhelix-device-key={keyed}
        onhelix-device-screenshot={() => say('helix-device-screenshot', 'take a screenshot')}
        onhelix-device-swipe={swiped}
        onhelix-device-tap={tapped}
        ref={phone}
        screen-height="915"
        screen-width="412"
      >
        <div className="stand-in">
          <span className="date">Saturday, October 10</span>
          <span className="time">9:41</span>
        </div>
      </helix-device-screen>

      <helix-list
        divided
        label="Events"
      >
        {rows.length === 0 ? (
          <helix-list-item>
            No events yet
            <span slot="description">Tap, swipe, or type on the screen</span>
          </helix-list-item>
        ) : (
          rows.map((row) => (
            <helix-list-item key={row.id}>
              {row.name}
              <span slot="description">{row.carried}</span>
            </helix-list-item>
          ))
        )}
      </helix-list>
    </div>
  )
}
