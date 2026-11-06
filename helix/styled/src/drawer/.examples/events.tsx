import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps the last six events.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Open the drawer, then close it', name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)
  const [open, setOpen] = useState(false)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const closing = () => {
    say('helix-before-close', 'About to close')
  }

  const moved = (event: Event & { newState?: string; oldState?: string }) => {
    say('toggle', `Changed from ${event.oldState} to ${event.newState}`)
  }

  const shut = () => {
    setOpen(false)
    say('close', 'Closed')
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-button
        emphasis="solid"
        onClick={() => setOpen(true)}
        tone="primary"
      >
        Open drawer
      </helix-button>

      <helix-drawer
        dismissible
        label="Filters"
        onClose={shut}
        onhelix-before-close={closing}
        onToggle={moved}
        open={open}
      >
        <helix-text>Filter the list by status, owner, and date.</helix-text>
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
