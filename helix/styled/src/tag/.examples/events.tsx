import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Press the tag\u2019s close control', name: 'Nothing yet' }]

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
      `"${event.detail.label}" asked to go, which is a request and not a removal`,
    )
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
        <helix-tag dismissible>infra</helix-tag>
        <helix-tag dismissible>docs</helix-tag>
      </helix-flex>

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
