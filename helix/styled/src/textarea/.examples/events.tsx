import type { HelixTextarea } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps this many of the most recent rows.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Type in the field', name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say(
      'helix-before-change',
      `about to change to ${event.detail.value.length} characters, can be canceled`,
    )
  }

  const typed = (event: Event & { currentTarget: HelixTextarea }) => {
    say('input', `${event.currentTarget.value.length} characters so far`)
  }

  const committed = (event: Event & { currentTarget: HelixTextarea }) => {
    say('change', `${event.currentTarget.value.length} characters, sent when the field loses focus`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-textarea
        label="Notes"
        onChange={committed}
        onhelix-before-change={proposed}
        onInput={typed}
        placeholder="Add a note"
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
