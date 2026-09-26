import type { HelixImage } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps the last six events.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'One image loads and one fails', name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const arrived = (event: Event & { currentTarget: HelixImage }) => {
    say('load', `${event.currentTarget.naturalWidth} by ${event.currentTarget.naturalHeight}`)
  }

  const failed = () => {
    say('error', 'Could not load the image')
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-flex
        direction="column"
        gap="sm"
      >
        <helix-image
          alt="A road winding below highland cliffs at sunset"
          onError={failed}
          onLoad={arrived}
          shape="rounded"
          src="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400"
        />
        <helix-image
          alt="Team photo"
          onError={failed}
          onLoad={arrived}
          shape="rounded"
          src="https://example.invalid/missing.png"
        />
      </helix-flex>

      <helix-list
        divided
        label="Events"
      >
        {heard.map((one, at) => (
          <helix-list-item key={`${one.name}-${at}`}>
            {one.name}
            <span slot="description">{one.carried}</span>
          </helix-list-item>
        ))}
      </helix-list>
    </helix-flex>
  )
}
