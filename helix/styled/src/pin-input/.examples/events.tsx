import type { HelixPinInput } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps the last six events.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Type the six-digit code', name: 'No events yet' }]

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

  const typed = (event: Event & { currentTarget: HelixPinInput }) => {
    say('input', `Value is "${event.currentTarget.value}"`)
  }

  const whole = (event: CustomEvent<{ value: string }>) => {
    say('helix-complete', `Entered "${event.detail.value}"`)
  }

  const committed = (event: Event & { currentTarget: HelixPinInput }) => {
    say('change', `Changed to "${event.currentTarget.value}"`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-pin-input
        hint="Sent to your phone"
        label="Verification code"
        onChange={committed}
        onhelix-before-change={proposed}
        onhelix-complete={whole}
        onInput={typed}
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
