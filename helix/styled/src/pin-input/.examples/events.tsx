import { useState } from 'react'

type Arrival = { carried: string; name: string }

const RESTING: Arrival[] = [{ carried: 'Type six characters', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => [...(before === RESTING ? [] : before), { carried, name }].slice(-6))
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-change', `proposing "${event.detail.value}", refusable`)
  }

  const typed = (event: Event & { currentTarget: HelixPinInput }) => {
    say('input', `"${event.currentTarget.value}" so far`)
  }

  const whole = (event: CustomEvent<{ value: string }>) => {
    say('helix-complete', `"${event.detail.value}", every box is filled`)
  }

  const committed = (event: Event & { currentTarget: HelixPinInput }) => {
    say('change', `"${event.currentTarget.value}", a filled code is the commit`)
  }

  return (
    <helix-flex direction="column" gap="md">
      <helix-pin-input
        hint="Sent to your phone"
        label="Verification code"
        onChange={committed}
        onhelix-before-change={proposed}
        onhelix-complete={whole}
        onInput={typed}
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
