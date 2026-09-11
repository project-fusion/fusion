import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 8

const RESTING: Arrival[] = [{ carried: 'Open a node, then choose one', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-activate', `proposing "${event.detail.value}", refusable`)
  }

  const chosen = (event: CustomEvent<{ value: string }>) => {
    say('helix-select', `"${event.detail.value}" was chosen, from whatever depth`)
  }

  /* Per node, because the open and close of one do not bubble: put these on the
     tree and nothing arrives. The two above do bubble and are bound once. */
  const opening = (node: string) => () => {
    say('helix-before-open', `${node} is about to open, and this does not bubble`)
  }

  const closing = (node: string) => () => {
    say('helix-before-close', `${node} is about to close, and nor does this`)
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
        label="Packages"
        onhelix-before-activate={proposed}
        onhelix-select={chosen}
      >
        <helix-tree-item
          onhelix-before-close={closing('helix')}
          onhelix-before-open={opening('helix')}
          onToggle={moved('helix')}
          value="helix"
        >
          helix
          <helix-tree-item
            slot="children"
            value="core"
          >
            core
          </helix-tree-item>
          <helix-tree-item
            slot="children"
            value="styled"
          >
            styled
          </helix-tree-item>
        </helix-tree-item>
        <helix-tree-item value="cortex">cortex</helix-tree-item>
      </helix-tree>

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
