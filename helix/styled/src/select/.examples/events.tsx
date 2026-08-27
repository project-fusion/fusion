import { useState } from 'react'

type Arrival = { carried: string; name: string }

const RESTING: Arrival[] = [{ carried: 'Choose a plan', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) =>
    setHeard((before) => [...(before === RESTING ? [] : before), { carried, name }].slice(-6))

  return (
    <helix-flex direction="column" gap="md">
      <helix-select
        label="Plan"
        name="plan"
        onChange={(event) => say('change', `"${event.currentTarget.value}", the choice is made`)}
        onhelix-before-change={(event) =>
          say('helix-before-change', `proposing "${event.detail.value}", refusable`)
        }
        onInput={(event) =>
          say('input', `"${event.currentTarget.value}", once and not once per element`)
        }
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
