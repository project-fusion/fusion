import type { HelixTextarea } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Type in the field', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-change', `proposing ${event.detail.value.length} characters, refusable`)
  }

  const typed = (event: Event & { currentTarget: HelixTextarea }) => {
    say('input', `${event.currentTarget.value.length} characters so far`)
  }

  const committed = (event: Event & { currentTarget: HelixTextarea }) => {
    say('change', `${event.currentTarget.value.length} characters, the reader is done`)
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
        placeholder="Type, then click away"
      />

      <helix-list
        divided
        label="What arrived"
      >
        {heard.map((one, at) => (
          <helix-list-item key={`${one.name}-${at}`}>
            {one.name}
            <span slot="supporting">{one.carried}</span>
          </helix-list-item>
        ))}
      </helix-list>
    </helix-flex>
  )
}
