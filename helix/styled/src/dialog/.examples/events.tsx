import { useRef, useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps the last six events.
const KEEP = 6

const RESTING: Arrival[] = [
  { carried: 'Open the dialog, then close it twice', name: 'No events yet' },
]

export function Example() {
  const [heard, setHeard] = useState(RESTING)
  const refused = useRef(false)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const opening = () => {
    say('helix-before-open', 'About to open')
  }

  const closing = (event: Event) => {
    if (refused.current) {
      say('helix-before-close', 'Allowed the close')
      return
    }
    refused.current = true
    event.preventDefault()
    say('helix-before-close', 'Canceled the close')
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
        commandfor="unsaved"
        emphasis="solid"
        tone="primary"
      >
        Open dialog
      </helix-button>

      <helix-dialog
        id="unsaved"
        label="Unsaved changes"
        onClose={shut}
        onhelix-before-close={closing}
        onhelix-before-open={opening}
        onToggle={moved}
      >
        <helix-text>You have changes that have not been saved.</helix-text>
        <helix-button
          command="--close"
          commandfor="unsaved"
          slot="footer"
        >
          Close
        </helix-button>
      </helix-dialog>

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
