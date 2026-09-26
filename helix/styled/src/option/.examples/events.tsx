import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps the last six events.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Choose an option', name: 'No events yet' }]

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
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-listbox
        label="Assignee"
        onhelix-select={chosen}
      >
        <helix-option value="ada">Ada Okonjo</helix-option>
        <helix-option value="grace">Sam Patel</helix-option>
        <helix-option value="alan">Alex Kim</helix-option>
      </helix-listbox>

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
