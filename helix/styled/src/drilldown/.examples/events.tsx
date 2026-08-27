import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Choose a row, then go deeper', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const chosen = (event: CustomEvent<{ value: string }>) => {
    say('helix-select', `"${event.detail.value}" was chosen, wherever in the stack it sits`)
  }

  return (
    <helix-flex direction="column" gap="md">
      <helix-drilldown label="Settings" onhelix-select={chosen}>
        <helix-drilldown-item value="appearance">
          Appearance
          <helix-drilldown-item slot="page" value="theme">
            Theme
          </helix-drilldown-item>
          <helix-drilldown-item slot="page" value="density">
            Density
          </helix-drilldown-item>
        </helix-drilldown-item>
        <helix-drilldown-item value="account">Account</helix-drilldown-item>
      </helix-drilldown>

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
