import type { HelixColorPicker } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps the last seven events.
const KEEP = 7

const RESTING: Arrival[] = [
  { carried: 'Pick a color, copy it, or use the eyedropper', name: 'No events yet' },
]

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

  const moved = (event: Event & { currentTarget: HelixColorPicker }) => {
    say('input', `Value is ${event.currentTarget.value}`)
  }

  const settled = (event: Event & { currentTarget: HelixColorPicker }) => {
    say('change', `Changed to ${event.currentTarget.value}`)
  }

  const copied = (event: CustomEvent<{ value: string }>) => {
    say('helix-copy', `Copied ${event.detail.value}`)
  }

  const sampling = () => {
    say('helix-sample-start', 'Eyedropper opened')
  }

  const sampled = () => {
    say('helix-sample-end', 'Eyedropper closed')
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-color-picker
        default-value="#3366ff"
        onChange={settled}
        onhelix-before-change={proposed}
        onhelix-copy={copied}
        onhelix-sample-end={sampled}
        onhelix-sample-start={sampling}
        onInput={moved}
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
