import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps the last six events.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Move between pages', name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  /* `helix-before-navigate` asks first. Cancel it to stay on the current page. */
  const asked = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-navigate', `Go to page ${event.detail.value}`)
  }

  const moved = (event: CustomEvent<{ value: string }>) => {
    say('helix-navigate', `On page ${event.detail.value}`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-pagination
        default-page="4"
        onhelix-before-navigate={asked}
        onhelix-navigate={moved}
        pages={12}
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
