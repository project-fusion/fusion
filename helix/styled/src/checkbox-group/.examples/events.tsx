import type { HelixCheckboxGroup } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The number of rows the log keeps.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Select a scope', name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-change', `about to change to "${event.detail.value}" (cancelable)`)
  }

  const moved = (event: Event & { currentTarget: HelixCheckboxGroup }) => {
    say('input', `value is now "${event.currentTarget.value || 'nothing'}"`)
  }

  const settled = (event: Event & { currentTarget: HelixCheckboxGroup }) => {
    say('change', `value is now "${event.currentTarget.value || 'nothing'}"`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-checkbox-group
        label="Scopes"
        name="scopes"
        onChange={settled}
        onhelix-before-change={proposed}
        onInput={moved}
      >
        <helix-checkbox value="read">Read</helix-checkbox>
        <helix-checkbox value="write">Write</helix-checkbox>
        <helix-checkbox value="admin">Admin</helix-checkbox>
      </helix-checkbox-group>

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
