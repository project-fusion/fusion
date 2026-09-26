import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The number of rows the log keeps.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Move between the slides', name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const moved = (event: CustomEvent<{ value: string }>) => {
    say('helix-select', `Slide ${event.detail.value} is in view`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-carousel
        label="Dashboard pages"
        onhelix-select={moved}
      >
        <helix-card separation="outlined">Overview</helix-card>
        <helix-card separation="outlined">Usage</helix-card>
        <helix-card separation="outlined">Billing</helix-card>
      </helix-carousel>

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
