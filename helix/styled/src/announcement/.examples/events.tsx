import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Press the close control', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const dismissed = (event: CustomEvent<{ label: string }>) => {
    say('helix-dismiss', `"${event.detail.label}" was dismissed, and this decides what happens`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-announcement
        dismissible
        onhelix-dismiss={dismissed}
        tone="info"
      >
        A new version is available.
      </helix-announcement>

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
