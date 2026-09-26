import type { HelixCheckbox } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The number of rows the log keeps.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Select the checkbox', name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const proposed = (event: CustomEvent<{ checked: boolean }>) => {
    say('helix-before-toggle', `about to change to ${event.detail.checked}`)
  }

  const moved = (event: Event & { currentTarget: HelixCheckbox }) => {
    say('input', `checked is now ${event.currentTarget.checked}`)
  }

  const settled = (event: Event & { currentTarget: HelixCheckbox }) => {
    say('change', `checked is now ${event.currentTarget.checked}`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-checkbox
        label="Send me release notes"
        name="notes"
        onChange={settled}
        onhelix-before-toggle={proposed}
        onInput={moved}
        value="yes"
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
