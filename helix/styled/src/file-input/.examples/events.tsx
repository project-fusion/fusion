import type { HelixFileInput } from '@fusion.dev/helix'
import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps the last six events.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Drop a file or choose one', name: 'No events yet' }]

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

  const chosen = (field: HelixFileInput) =>
    field.files.map((file) => file.name).join(', ') || 'nothing'

  const moved = (event: Event & { currentTarget: HelixFileInput }) => {
    say('input', `Value is ${chosen(event.currentTarget)}`)
  }

  const settled = (event: Event & { currentTarget: HelixFileInput }) => {
    say('change', `Chose ${chosen(event.currentTarget)}`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-file-input
        hint="PNG or JPG"
        label="Attachments"
        multiple
        name="attachments"
        onChange={settled}
        onhelix-before-change={proposed}
        onInput={moved}
      />

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
