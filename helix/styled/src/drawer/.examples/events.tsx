import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Open it, then close it', name: 'Nothing yet' }]

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

  const shut = () => {
    say('close', 'the platform name, relayed from the dialog inside')
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
        <helix-text>Everything the list is narrowed by.</helix-text>
        <helix-button
          command="--close"
          commandfor="panel"
        >
          Done
        </helix-button>
      </helix-drawer>

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
