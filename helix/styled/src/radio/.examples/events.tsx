import type { HelixRadioGroup } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Choose an answer', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-change', `proposing "${event.detail.value}", refusable`)
  }

  const moved = (event: Event & { currentTarget: HelixRadioGroup }) => {
    say('input', `"${event.currentTarget.value}", once and not once per element`)
  }

  const settled = (event: Event & { currentTarget: HelixRadioGroup }) => {
    say('change', `"${event.currentTarget.value}", the choice is made`)
  }

  const pressed = (event: CustomEvent<{ value: string }>) => {
    say('helix-select', `"${event.detail.value}" was pressed, which is the member speaking`)
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
        label="What arrived"
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
