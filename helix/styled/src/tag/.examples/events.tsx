import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps this many of the most recent rows.
const KEEP = 6

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
      <helix-flex
        gap="xs"
        onhelix-dismiss={dismissed}
      >
        <helix-tag dismissible>design</helix-tag>
        <helix-tag dismissible>billing</helix-tag>
        <helix-tag dismissible>urgent</helix-tag>
      </helix-flex>

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
