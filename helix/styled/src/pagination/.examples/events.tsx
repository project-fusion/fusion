import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Move between pages', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-change', `proposing page ${event.detail.value}, refusable`)
  }

  const moved = (event: CustomEvent<{ value: string }>) => {
    say('helix-navigate', `page ${event.detail.value}, which is a move and not a choice`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-pagination
        default-page="4"
        onhelix-before-change={proposed}
        onhelix-navigate={moved}
        pages={12}
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
