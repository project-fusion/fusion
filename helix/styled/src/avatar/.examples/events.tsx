import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The number of rows the log keeps.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'One image loads and one fails', name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const arrived = (name: string) => () => {
    say('load', `${name} loaded`)
  }

  const failed = (name: string) => () => {
    say('error', `${name} failed to load, so the initials are shown`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-flex gap="sm">
        <helix-avatar
          name="Ada Okonjo"
          onError={failed('Ada Okonjo')}
          onLoad={arrived('Ada Okonjo')}
          src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96"
        />
        <helix-avatar
          name="Grace Hopper"
          onError={failed('Grace Hopper')}
          onLoad={arrived('Grace Hopper')}
          src="https://example.invalid/missing.png"
        />
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
