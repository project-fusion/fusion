import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Open the panel, then close it', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const opening = () => {
    say('helix-before-open', 'about to open, and refusable')
  }

  const closing = () => {
    say('helix-before-close', 'about to close, and refusable')
  }

  const moved = (event: Event & { newState?: string; oldState?: string }) => {
    say('toggle', `${event.oldState} to ${event.newState}, after the state moved`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-navigation label="Main">
        <a href="#overview">Overview</a>
        <helix-megamenu
          label="Products"
          onhelix-before-close={closing}
          onhelix-before-open={opening}
          onToggle={moved}
        >
          <div data-megamenu-group>
            <h3 data-megamenu-heading>Design</h3>
            <a
              data-megamenu-item
              href="#helix"
            >
              Helix
            </a>
          </div>
        </helix-megamenu>
      </helix-navigation>

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
