import { useState } from 'react'

type Arrival = { carried: string; name: string }

const RESTING: Arrival[] = [{ carried: 'Type in the field', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  // The last few, so a long sentence does not push the field off the preview.
  const say = (name: string, carried: string) => {
    setHeard((before) => [...(before === RESTING ? [] : before), { carried, name }].slice(-6))
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-change', `proposing "${event.detail.value}", refusable`)
  }

  const typed = (event: Event & { currentTarget: HelixInput }) => {
    say('input', `"${event.currentTarget.value}" so far`)
  }

  const committed = (event: Event & { currentTarget: HelixInput }) => {
    say('change', `"${event.currentTarget.value}", the reader is done`)
  }

  return (
    <helix-flex direction="column" gap="md">
      <helix-input
        label="Name"
        onChange={committed}
        onhelix-before-change={proposed}
        onInput={typed}
        placeholder="Type, then click away"
      />

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
