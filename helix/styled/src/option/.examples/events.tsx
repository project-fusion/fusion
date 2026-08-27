import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Choose an option', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const chosen = (event: CustomEvent<{ value: string }>) => {
    const from = (event.composedPath()[0] as Element).localName
    say('helix-select', `"${event.detail.value}" from <${from}>`)
  }

  return (
    <helix-flex direction="column" gap="md">
      <helix-listbox label="Assignee" onhelix-select={chosen}>
        <helix-option value="ada">Ada Okonjo</helix-option>
        <helix-option value="grace">Grace Hopper</helix-option>
        <helix-option value="alan">Alan Turing</helix-option>
      </helix-listbox>

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
