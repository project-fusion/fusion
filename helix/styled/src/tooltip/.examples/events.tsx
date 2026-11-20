import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps this many of the most recent rows.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Hover the button, then tab to it', name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const opening = () => {
    say('helix-before-open', 'about to open, can be canceled')
  }

  const closing = () => {
    say('helix-before-close', 'about to close, can be canceled')
  }

  const moved = (event: Event & { newState?: string; oldState?: string }) => {
    const { newState, oldState } = event
    say('toggle', `${oldState} to ${newState}, after the state moved`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-tooltip
        content="Make the page visible to everyone"
        onhelix-before-close={closing}
        onhelix-before-open={opening}
        onToggle={moved}
      >
        <helix-button>Publish page</helix-button>
      </helix-tooltip>

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
