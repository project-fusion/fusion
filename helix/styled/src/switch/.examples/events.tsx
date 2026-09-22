import type { HelixSwitch } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Flip the switch', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const proposed = (event: CustomEvent<{ checked: boolean }>) => {
    say('helix-before-toggle', `proposing ${event.detail.checked}, a real boolean and not a string`)
  }

  const moved = (event: Event & { currentTarget: HelixSwitch }) => {
    say('input', `${event.currentTarget.checked}, announced as the state moves`)
  }

  const settled = (event: Event & { currentTarget: HelixSwitch }) => {
    say('change', `${event.currentTarget.checked}, relayed from the control inside`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-switch
        label="Deploy on push"
        name="autodeploy"
        onChange={settled}
        onhelix-before-toggle={proposed}
        onInput={moved}
      />

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
