import { useState } from 'react'

type Arrival = { carried: string; name: string }

const RESTING: Arrival[] = [{ carried: 'Step it, or type and click away', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => [...(before === RESTING ? [] : before), { carried, name }].slice(-6))
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-change', `proposing "${event.detail.value}", refusable`)
  }

  const stepped = (event: Event & { currentTarget: HelixNumberInput }) => {
    say('input', `${event.currentTarget.valueAsNumber} so far`)
  }

  const committed = (event: Event & { currentTarget: HelixNumberInput }) => {
    say('change', `${event.currentTarget.valueAsNumber}, the reader is done`)
  }

  return (
    <helix-flex direction="column" gap="md">
      <helix-number-input
        default-value="3"
        label="Guests"
        min={1}
        onChange={committed}
        onhelix-before-change={proposed}
        onInput={stepped}
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
