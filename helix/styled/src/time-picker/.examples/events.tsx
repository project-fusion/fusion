import type { HelixTimePicker } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps this many of the most recent rows.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Choose a time', name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-change', `about to change to "${event.detail.value}", can be canceled`)
  }

  const moved = (event: Event & { currentTarget: HelixTimePicker }) => {
    say('input', `"${event.currentTarget.value}", sent as it is chosen`)
  }

  const settled = (event: Event & { currentTarget: HelixTimePicker }) => {
    say('change', `"${event.currentTarget.value}", sent when the value is committed`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-time-picker
        default-value="09:30"
        onChange={settled}
        onhelix-before-change={proposed}
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
