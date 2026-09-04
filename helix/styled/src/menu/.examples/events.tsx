import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Open the menu and choose an item', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const opening = () => {
    say('helix-before-open', 'about to open, and refusable')
  }

  const closing = () => {
    say('helix-before-close', 'about to close, and refusable')
  }

  const moved = (event: Event & { newState?: string; oldState?: string }) => {
    say('toggle', `${event.oldState} to ${event.newState}, after the state moved`)
  }

  const chosen = (event: CustomEvent<{ value: string }>) => {
    say('helix-select', `"${event.detail.value}" was chosen, and this one bubbles`)
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
        label="What arrived"
      >
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
