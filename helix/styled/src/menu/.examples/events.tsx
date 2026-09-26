import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps the last six events.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Open the menu and choose an item', name: 'No events yet' }]

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

  const chosen = (event: CustomEvent<{ value: string }>) => {
    say('helix-select', `Chose "${event.detail.value}"`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-menu
        label="Actions"
        onhelix-before-close={closing}
        onhelix-before-open={opening}
        onhelix-select={chosen}
        onToggle={moved}
      >
        <helix-button slot="trigger">Actions</helix-button>
        <helix-menu-item value="rename">Rename</helix-menu-item>
        <helix-menu-item value="duplicate">Duplicate</helix-menu-item>
        <helix-menu-item value="archive">Archive</helix-menu-item>
      </helix-menu>

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
