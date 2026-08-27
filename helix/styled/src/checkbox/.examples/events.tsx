import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Tick the box', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const proposed = (event: CustomEvent<{ checked: boolean }>) => {
    say('helix-before-toggle', `proposing ${event.detail.checked}, a real boolean and not a string`)
  }

  const moved = (event: Event & { currentTarget: HelixCheckbox }) => {
    say('input', `${event.currentTarget.checked}, announced as the state moves`)
  }

  const settled = (event: Event & { currentTarget: HelixCheckbox }) => {
    say('change', `${event.currentTarget.checked}, relayed from the control inside`)
  }

  return (
    <helix-flex direction="column" gap="md">
      <helix-checkbox
        label="Send me release notes"
        name="notes"
        onChange={settled}
        onhelix-before-toggle={proposed}
        onInput={moved}
        value="yes"
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
