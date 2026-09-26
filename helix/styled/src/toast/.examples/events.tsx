import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps this many of the most recent rows.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: "Press a message's close control", name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const dismissed = (event: CustomEvent<{ label: string }>) => {
    say(
      'helix-dismiss',
      `the close button on "${event.detail.label}" was pressed, and the event bubbles`,
    )
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-toast
        label="Notifications"
        onhelix-dismiss={dismissed}
        placement="bottom-end"
      >
        <helix-toast-item
          dismissible
          tone="success"
        >
          Project saved.
        </helix-toast-item>
        <helix-toast-item
          dismissible
          tone="danger"
        >
          The upload failed.
        </helix-toast-item>
      </helix-toast>

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
