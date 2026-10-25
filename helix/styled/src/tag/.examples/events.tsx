import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps this many of the most recent rows.
const KEEP = 6

// Each tag hears its own remove button, which a phone needs: an event there
// reaches the element that sent it, and no element around it.
const TAGS = ['design', 'billing', 'urgent']

const RESTING: Arrival[] = [
  { carried: 'Press the tag\u2019s close control', name: 'No events yet' },
]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const dismissed = (event: CustomEvent<{ label: string }>) => {
    say('helix-dismiss', `the remove button on "${event.detail.label}" was pressed`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-flex gap="xs">
        {TAGS.map((one) => (
          <helix-tag
            dismissible
            key={one}
            onhelix-dismiss={dismissed}
          >
            {one}
          </helix-tag>
        ))}
      </helix-flex>

      <helix-list
        divided
        label="Events"
      >
        {heard.map((one, at) => (
          <helix-list-item key={`${one.name}-${at}`}>
            {one.name}
            <helix-text slot="description">{one.carried}</helix-text>
          </helix-list-item>
        ))}
      </helix-list>
    </helix-flex>
  )
}
