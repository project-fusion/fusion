import type { HelixDateInput } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps the last eight events.
const KEEP = 8

const RESTING: Arrival[] = [{ carried: 'Type a date or open the calendar', name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const showing = () => {
    say('helix-before-open', 'About to open')
  }

  const hiding = () => {
    say('helix-before-close', 'About to close')
  }

  const panelMoved = (event: Event & { newState?: string; oldState?: string }) => {
    say('toggle', `Changed from ${event.oldState} to ${event.newState}`)
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-change', `Proposed "${event.detail.value}"`)
  }

  const moved = (event: Event & { currentTarget: HelixDateInput }) => {
    say('input', `Value is "${event.currentTarget.value}"`)
  }

  const settled = (event: Event & { currentTarget: HelixDateInput }) => {
    say('change', `Chose "${event.currentTarget.value}"`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-date-input
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
