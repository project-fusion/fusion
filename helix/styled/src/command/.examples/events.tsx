import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps the last six events.
const KEEP = 6

const RESTING: Arrival[] = [
  { carried: 'Open the palette and choose a command', name: 'No events yet' },
]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const opening = () => {
    say('helix-before-open', 'About to open')
  }

  const closing = () => {
    say('helix-before-close', 'About to close')
  }

  const moved = (event: Event & { newState?: string; oldState?: string }) => {
    say('toggle', `Changed from ${event.oldState} to ${event.newState}`)
  }

  const ran = (event: CustomEvent<{ value: string }>) => {
    say('helix-select', `Ran "${event.detail.value}"`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-command
        label="Commands"
        onhelix-before-close={closing}
        onhelix-before-open={opening}
        onhelix-select={ran}
        onToggle={moved}
      >
        <helix-option value="new">New file</helix-option>
        <helix-option value="open">Open folder</helix-option>
        <helix-option value="save">Save all</helix-option>
      </helix-command>

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
