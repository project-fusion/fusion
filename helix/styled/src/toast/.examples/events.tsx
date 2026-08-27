import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: "Press a message's close control", name: 'Nothing yet' }]

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
      `"${event.detail.label}" asked to go, and it bubbles so the stack hears it`,
    )
  }

  return (
    <helix-flex direction="column" gap="md">
      <helix-toast label="Notifications" onhelix-dismiss={dismissed} placement="bottom-end">
        <helix-toast-item dismissible tone="success">
          Project saved.
        </helix-toast-item>
        <helix-toast-item dismissible tone="danger">
          The build failed.
        </helix-toast-item>
      </helix-toast>

      <helix-list divided label="What arrived">
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
