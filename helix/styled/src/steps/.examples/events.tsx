import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Press a step', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-activate', `proposing "${event.detail.value}", refusable`)
  }

  const pressed = (event: CustomEvent<{ value: string }>) => {
    say('helix-select', `"${event.detail.value}" was pressed, which is the step speaking`)
  }

  return (
    <helix-flex direction="column" gap="md">
      <helix-steps label="Checkout" onhelix-before-activate={proposed} onhelix-select={pressed}>
        <helix-step value="details">Details</helix-step>
        <helix-step value="payment">Payment</helix-step>
        <helix-step value="review">Review</helix-step>
      </helix-steps>

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
