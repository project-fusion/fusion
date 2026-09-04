import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Open one, then dismiss it', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const read = (event: CustomEvent<{ value: string }>) => {
    say('helix-read', `${event.detail.value}, which is a request the feed answers`)
  }

  const dismissed = (event: CustomEvent<{ label: string }>) => {
    say('helix-dismiss', `"${event.detail.label}" asked to go`)
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
          <strong>Grace Hopper</strong> left a comment.
        </helix-notification>
      </helix-notifications>

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
