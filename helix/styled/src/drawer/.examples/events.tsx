import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps the last six events.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Open the drawer, then close it', name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const opening = () => {
    say('helix-before-open', 'About to open')
  }

  const closing = () => {
    say('helix-before-close', 'About to close')
  }

  const moved = (event: Event & { newState?: string; oldState?: string }) => {
    say('toggle', `Changed from ${event.oldState} to ${event.newState}`)
  }

  const shut = () => {
    say('close', 'Closed')
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-button
        command="--show"
        commandfor="panel"
        emphasis="solid"
        tone="primary"
      >
        Open drawer
      </helix-button>

      <helix-drawer
        id="panel"
        label="Filters"
        onClose={shut}
        onhelix-before-close={closing}
        onhelix-before-open={opening}
        onToggle={moved}
      >
        <helix-text>Filter the list by status, owner, and date.</helix-text>
        <helix-button
          command="--close"
          commandfor="panel"
        >
          Done
        </helix-button>
      </helix-drawer>

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
