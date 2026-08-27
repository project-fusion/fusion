import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 8

const RESTING: Arrival[] = [{ carried: 'Open it and choose a plan', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const showing = () => {
    say('helix-before-open', 'the panel is about to show, refusable')
  }

  const hiding = () => {
    say('helix-before-close', 'the panel is about to go, refusable')
  }

  const panelMoved = (event: Event & { newState?: string; oldState?: string }) => {
    say('toggle', `${event.oldState} to ${event.newState}, after the panel moved`)
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-change', `proposing "${event.detail.value}", refusable`)
  }

  const moved = (event: Event & { currentTarget: HelixSelect }) => {
    say('input', `"${event.currentTarget.value}", once and not once per element`)
  }

  const chosen = (event: Event & { currentTarget: HelixSelect }) => {
    say('change', `"${event.currentTarget.value}", the choice is made`)
  }

  return (
    <helix-flex direction="column" gap="md">
      <helix-select
        label="Plan"
        name="plan"
        onChange={chosen}
        onhelix-before-change={proposed}
        onhelix-before-close={hiding}
        onhelix-before-open={showing}
        onInput={moved}
        onToggle={panelMoved}
      >
        <helix-option value="free">Free</helix-option>
        <helix-option value="team">Team</helix-option>
        <helix-option value="scale">Scale</helix-option>
      </helix-select>

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
