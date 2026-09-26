import type { HelixTimeInput } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps this many of the most recent rows.
const KEEP = 8

const RESTING: Arrival[] = [{ carried: 'Type a time, or open the wheels', name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const showing = () => {
    say('helix-before-open', 'the panel is about to open, can be canceled')
  }

  const hiding = () => {
    say('helix-before-close', 'the panel is about to close, can be canceled')
  }

  const panelMoved = (event: Event & { newState?: string; oldState?: string }) => {
    say('toggle', `${event.oldState} to ${event.newState}, after the panel opened or closed`)
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-change', `about to change to "${event.detail.value}", can be canceled`)
  }

  const moved = (event: Event & { currentTarget: HelixTimeInput }) => {
    say('input', `"${event.currentTarget.value}", sent once for the whole value`)
  }

  const settled = (event: Event & { currentTarget: HelixTimeInput }) => {
    say('change', `"${event.currentTarget.value}", sent when the value is committed`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-time-input
        label="Starts"
        name="starts"
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
