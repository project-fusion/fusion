import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [
  { carried: 'Put the cursor in the field and press slash', name: 'Nothing yet' },
]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const pressed = (event: CustomEvent<{ keys: string }>) => {
    say('helix-shortcut', `${event.detail.keys} was pressed inside the field it sits in`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-input
        aria-label="Filter"
        placeholder="Filter"
      >
        <helix-kbd
          keys="/"
          onhelix-shortcut={pressed}
          slot="end"
          within="control"
        />
      </helix-input>

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
