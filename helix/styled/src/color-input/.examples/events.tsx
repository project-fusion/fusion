import type { HelixColorInput } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The number of rows the log keeps.
const KEEP = 8

const RESTING: Arrival[] = [
  { carried: 'Open the swatch, then choose a color', name: 'No events yet' },
]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const showing = () => {
    say('helix-before-open', 'the panel is about to open (cancelable)')
  }

  const hiding = () => {
    say('helix-before-close', 'the panel is about to close (cancelable)')
  }

  const panelMoved = (event: Event & { newState?: string; oldState?: string }) => {
    say('toggle', `${event.oldState} to ${event.newState}`)
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-change', `about to change to "${event.detail.value}" (cancelable)`)
  }

  const moved = (event: Event & { currentTarget: HelixColorInput }) => {
    say('input', `value is now "${event.currentTarget.value}"`)
  }

  const settled = (event: Event & { currentTarget: HelixColorInput }) => {
    say('change', `value is now "${event.currentTarget.value}"`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-color-input
        label="Brand color"
        name="brand"
        onChange={settled}
        onhelix-before-change={proposed}
        onhelix-before-close={hiding}
        onhelix-before-open={showing}
        onInput={moved}
        onToggle={panelMoved}
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
