import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps the last six events.
const KEEP = 6

const RESTING: Arrival[] = [
  { carried: 'Open a notification, then dismiss it', name: 'No events yet' },
]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const read = (event: CustomEvent<{ read: boolean }>) => {
    say('helix-read', `Mark as ${event.detail.read ? 'read' : 'unread'}`)
  }

  const dismissed = (event: CustomEvent<{ label: string }>) => {
    say('helix-dismiss', `Dismissed "${event.detail.label}"`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-notifications
        label="Notifications"
        mark-all
        onhelix-dismiss={dismissed}
        onhelix-read={read}
      >
        <helix-notification dismissible>
          <strong>Ada Okonjo</strong> approved your deploy.
        </helix-notification>
        <helix-notification dismissible>
          <strong>Sam Patel</strong> left a comment.
        </helix-notification>
      </helix-notifications>

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
