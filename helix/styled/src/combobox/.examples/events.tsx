import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 9

const RESTING: Arrival[] = [{ carried: 'Type to narrow it, then choose', name: 'Nothing yet' }]

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

  const moved = (event: Event & { currentTarget: HelixCombobox }) => {
    say('input', `"${event.currentTarget.value}", once and not once per element`)
  }

  const settled = (event: Event & { currentTarget: HelixCombobox }) => {
    say('change', `"${event.currentTarget.value}", the reader is done`)
  }

  const made = (event: CustomEvent<{ value: string }>) => {
    say('helix-create', `"${event.detail.value}" is not in the list and was made from the query`)
  }

  return (
    <helix-flex direction="column" gap="md">
      <helix-combobox
        creatable
        label="Language"
        name="language"
        onChange={settled}
        onhelix-before-change={proposed}
        onhelix-before-close={hiding}
        onhelix-before-open={showing}
        onhelix-create={made}
        onInput={moved}
        onToggle={panelMoved}
        placeholder="Search languages"
      >
        <helix-option value="rust">Rust</helix-option>
        <helix-option value="ts">TypeScript</helix-option>
        <helix-option value="go">Go</helix-option>
      </helix-combobox>

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
