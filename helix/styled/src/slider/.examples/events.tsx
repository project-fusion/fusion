import type { HelixSlider } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Drag the thumb, then let go', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-change', `proposing ${event.detail.value}, refusable`)
  }

  const dragging = (event: Event & { currentTarget: HelixSlider }) => {
    say('input', `${event.currentTarget.value} while the thumb moves`)
  }

  const released = (event: Event & { currentTarget: HelixSlider }) => {
    say('change', `${event.currentTarget.value}, once it is let go`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-slider
        default-value="40"
        label="Quality"
        onChange={released}
        onhelix-before-change={proposed}
        onInput={dragging}
        show-value
      />

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
