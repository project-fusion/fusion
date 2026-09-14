import type { HelixImage } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'One picture loads and one does not', name: 'Nothing yet' }]

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
    say('error', 'nothing arrived, so the fallback shows')
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
          rounded
          src="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400"
        />
        <helix-image
          alt="Nothing, because this one cannot arrive"
          onError={failed}
          onLoad={arrived}
          rounded
          src="https://example.invalid/missing.png"
        />
      </helix-flex>

      <helix-list
        divided
        label="What arrived"
      >
        {heard.map((one, at) => (
          <helix-list-item key={`${one.name}-${at}`}>
            {one.name}
            <span slot="supporting">{one.carried}</span>
          </helix-list-item>
        ))}
      </helix-list>
    </helix-flex>
  )
}
