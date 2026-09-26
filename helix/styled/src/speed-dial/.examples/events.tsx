import { useState } from 'react'
import './events.css'

type Arrival = { carried: string; name: string }

// The log keeps this many of the most recent rows.
const KEEP = 7

const RESTING: Arrival[] = [
  { carried: 'Open the dial, then choose an action', name: 'No events yet' },
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
    say('helix-before-open', 'about to open, can be canceled')
  }

  const closing = () => {
    say('helix-before-close', 'about to close, can be canceled')
  }

  const moved = (event: Event & { newState?: string; oldState?: string }) => {
    say('toggle', `${event.oldState} to ${event.newState}, after the state moved`)
  }

  const chosen = (event: CustomEvent<{ value: string }>) => {
    say('helix-select', `"${event.detail.value}" was chosen, and the event bubbles`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <div className="stage">
        <helix-speed-dial
          data-dock="bottom-end"
          data-dock-within
          label="Actions"
          onhelix-before-close={closing}
          onhelix-before-open={opening}
          onhelix-select={chosen}
          onToggle={moved}
        >
          <helix-speed-dial-item value="new">
            New file
            <helix-icon
              name="plus"
              slot="icon"
            />
          </helix-speed-dial-item>
          <helix-speed-dial-item value="upload">
            Upload file
            <helix-icon
              name="upload-simple"
              slot="icon"
            />
          </helix-speed-dial-item>
        </helix-speed-dial>
      </div>

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
