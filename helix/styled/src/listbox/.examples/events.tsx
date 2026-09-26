import type { HelixListbox } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps the last six events.
const KEEP = 6

const RESTING: Arrival[] = [
  { carried: 'Type to filter, then choose a region', name: 'No events yet' },
]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-change', `Proposed "${event.detail.value}"`)
  }

  const moved = (event: Event & { currentTarget: HelixListbox }) => {
    say('input', `Value is "${event.currentTarget.value}"`)
  }

  const settled = (event: Event & { currentTarget: HelixListbox }) => {
    say('change', `Chose "${event.currentTarget.value}"`)
  }

  const filtered = (event: CustomEvent<{ value: string }>) => {
    say('helix-filter', `Filter text is "${event.detail.value}"`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-listbox
        filterable
        label="Region"
        name="region"
        onChange={settled}
        onhelix-before-change={proposed}
        onhelix-filter={filtered}
        onInput={moved}
      >
        <helix-option value="lhr">London</helix-option>
        <helix-option value="fra">Frankfurt</helix-option>
        <helix-option value="iad">Virginia</helix-option>
      </helix-listbox>

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
