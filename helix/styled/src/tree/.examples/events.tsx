import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps this many of the most recent rows.
const KEEP = 8

const RESTING: Arrival[] = [{ carried: 'Open a node, then choose one', name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-activate', `about to change to "${event.detail.value}", can be canceled`)
  }

  const chosen = (event: CustomEvent<{ value: string }>) => {
    say('helix-select', `"${event.detail.value}" was chosen, and the event bubbles`)
  }

  /* The open and close events do not bubble, so each node has its own
     listeners. The two events above bubble and are bound once. */
  const opening = (node: string) => () => {
    say('helix-before-open', `${node} is about to open, and the event does not bubble`)
  }

  const closing = (node: string) => () => {
    say('helix-before-close', `${node} is about to close, and the event does not bubble`)
  }

  const moved = (node: string) => (event: Event & { newState?: string; oldState?: string }) => {
    say('toggle', `${node} went ${event.oldState} to ${event.newState}`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-tree
        default-active="core"
        label="Folders"
        onhelix-before-activate={proposed}
        onhelix-select={chosen}
      >
        <helix-tree-item
          onhelix-before-close={closing('helix')}
          onhelix-before-open={opening('helix')}
          onToggle={moved('helix')}
          value="helix"
        >
          Projects
          <helix-tree-item
            slot="children"
            value="core"
          >
            Website
          </helix-tree-item>
          <helix-tree-item
            slot="children"
            value="styled"
          >
            Mobile app
          </helix-tree-item>
        </helix-tree-item>
        <helix-tree-item value="cortex">Archive</helix-tree-item>
      </helix-tree>

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
