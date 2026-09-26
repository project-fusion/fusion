import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps this many of the most recent rows.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Press a step', name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-activate', `about to change to "${event.detail.value}", can be canceled`)
  }

  const pressed = (event: CustomEvent<{ value: string }>) => {
    say('helix-select', `"${event.detail.value}" was pressed`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-steps
        label="Checkout"
        onhelix-before-activate={proposed}
        onhelix-select={pressed}
      >
        <helix-step value="details">Details</helix-step>
        <helix-step value="payment">Payment</helix-step>
        <helix-step value="review">Review</helix-step>
      </helix-steps>

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
