import type { HelixSlider } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps the last six events.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Drag the thumb, then let go', name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-change', `Proposed ${event.detail.value}`)
  }

  const dragging = (event: Event & { currentTarget: HelixSlider }) => {
    say('input', `Value is ${event.currentTarget.value}`)
  }

  const released = (event: Event & { currentTarget: HelixSlider }) => {
    say('change', `Changed to ${event.currentTarget.value}`)
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
