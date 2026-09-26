import type { HelixCombobox } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps the last nine events.
const KEEP = 9

const RESTING: Arrival[] = [
  { carried: 'Type to filter, then choose a language', name: 'No events yet' },
]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const showing = () => {
    say('helix-before-open', 'About to open')
  }

  const hiding = () => {
    say('helix-before-close', 'About to close')
  }

  const panelMoved = (event: Event & { newState?: string; oldState?: string }) => {
    say('toggle', `Changed from ${event.oldState} to ${event.newState}`)
  }

  const narrowing = (event: CustomEvent<{ value: string }>) => {
    say('helix-filter', `Filter text is "${event.detail.value}"`)
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-change', `Proposed "${event.detail.value}"`)
  }

  const moved = (event: Event & { currentTarget: HelixCombobox }) => {
    say('input', `Value is "${event.currentTarget.value}"`)
  }

  const settled = (event: Event & { currentTarget: HelixCombobox }) => {
    say('change', `Chose "${event.currentTarget.value}"`)
  }

  const made = (event: CustomEvent<{ value: string }>) => {
    say('helix-create', `Created "${event.detail.value}"`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-combobox
        creatable
        label="Language"
        name="language"
        onChange={settled}
        onhelix-before-change={proposed}
        onhelix-before-close={hiding}
        onhelix-before-open={showing}
        onhelix-create={made}
        onhelix-filter={narrowing}
        onInput={moved}
        onToggle={panelMoved}
        placeholder="Search languages"
      >
        <helix-option value="rust">Rust</helix-option>
        <helix-option value="ts">TypeScript</helix-option>
        <helix-option value="go">Go</helix-option>
      </helix-combobox>

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
