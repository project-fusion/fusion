import type { HelixToggleGroup } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps this many of the most recent rows.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Press one option, then another', name: 'No events yet' }]

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

  const moved = (event: Event & { currentTarget: HelixToggleGroup }) => {
    say('input', `"${event.currentTarget.value}", sent once for the group`)
  }

  const settled = (event: Event & { currentTarget: HelixToggleGroup }) => {
    say('change', `"${event.currentTarget.value}", sent when the value is committed`)
  }

  const pressed = (event: CustomEvent<{ value: string }>) => {
    say('helix-select', `"${event.detail.value}" was pressed`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-toggle-group
        label="Density"
        onChange={settled}
        onhelix-before-change={proposed}
        onhelix-select={pressed}
        onInput={moved}
      >
        <helix-toggle value="sm">Compact</helix-toggle>
        <helix-toggle value="md">Default</helix-toggle>
        <helix-toggle value="lg">Comfortable</helix-toggle>
      </helix-toggle-group>

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
