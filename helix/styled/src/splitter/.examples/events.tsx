import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [
  { carried: 'Drag the divider, then drag it to an edge', name: 'Nothing yet' },
]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const settling = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-resize', `settling at ${event.detail.value} percent`)
  }

  const shutting = (event: CustomEvent<{ value: string }>) => {
    say(
      'helix-before-collapse',
      event.detail.value === '' ? 'reopened' : `shut the ${event.detail.value} pane`,
    )
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-splitter
        collapsed-size="8"
        default-position="50"
        onhelix-before-collapse={shutting}
        onhelix-before-resize={settling}
        style={{ blockSize: '10rem' }}
      >
        <helix-card
          separation="plain"
          slot="start"
        >
          <helix-text>Navigator</helix-text>
        </helix-card>
        <helix-card
          separation="plain"
          slot="end"
        >
          <helix-text>Editor</helix-text>
        </helix-card>
      </helix-splitter>

      <helix-list
        divided
        label="What arrived"
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
