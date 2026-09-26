import type { HelixSwitch } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps this many of the most recent rows.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Flip the switch', name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const proposed = (event: CustomEvent<{ checked: boolean }>) => {
    say('helix-before-toggle', `about to change to ${event.detail.checked}, can be canceled`)
  }

  const moved = (event: Event & { currentTarget: HelixSwitch }) => {
    say('input', `${event.currentTarget.checked}, sent as the value changes`)
  }

  const settled = (event: Event & { currentTarget: HelixSwitch }) => {
    say('change', `${event.currentTarget.checked}, sent when the change is committed`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-switch
        label="Automatic updates"
        name="autodeploy"
        onChange={settled}
        onhelix-before-toggle={proposed}
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
