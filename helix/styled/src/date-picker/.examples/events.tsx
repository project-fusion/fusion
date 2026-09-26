import type { HelixDatePicker } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps the last six events.
const KEEP = 6

const RESTING: Arrival[] = [
  { carried: 'Change the month, then choose a day', name: 'No events yet' },
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
    say('helix-before-change', `Proposed "${event.detail.value}"`)
  }

  const moved = (event: Event & { currentTarget: HelixDatePicker }) => {
    say('input', `Value is "${event.currentTarget.value}"`)
  }

  const settled = (event: Event & { currentTarget: HelixDatePicker }) => {
    say('change', `Chose "${event.currentTarget.value}"`)
  }

  const paged = (event: CustomEvent<{ value: string }>) => {
    say('helix-navigate', `Showing ${event.detail.value}`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-date-picker
        default-month="2026-08"
        label="Delivery date"
        onChange={settled}
        onhelix-before-change={proposed}
        onhelix-navigate={paged}
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
