import type { HelixRadioGroup } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps the last six events.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Choose a plan', name: 'No events yet' }]

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

  const moved = (event: Event & { currentTarget: HelixRadioGroup }) => {
    say('input', `Value is "${event.currentTarget.value}"`)
  }

  const settled = (event: Event & { currentTarget: HelixRadioGroup }) => {
    say('change', `Chose "${event.currentTarget.value}"`)
  }

  const pressed = (event: CustomEvent<{ value: string }>) => {
    say('helix-select', `Pressed "${event.detail.value}"`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-radio-group
        label="Plan"
        name="plan"
        onChange={settled}
        onhelix-before-change={proposed}
        onhelix-select={pressed}
        onInput={moved}
      >
        <helix-radio value="free">Free</helix-radio>
        <helix-radio value="team">Team</helix-radio>
        <helix-radio value="scale">Scale</helix-radio>
      </helix-radio-group>

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
