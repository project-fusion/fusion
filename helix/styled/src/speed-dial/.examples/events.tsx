import { useState } from 'react'
import './events.css'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 7

const RESTING: Arrival[] = [
  { carried: 'Open the dial, then choose an action', name: 'Nothing yet' },
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
    say('helix-before-open', 'about to fan out, and refusable')
  }

  const closing = () => {
    say('helix-before-close', 'about to fold away, and refusable')
  }

  const moved = (event: Event & { newState?: string; oldState?: string }) => {
    say('toggle', `${event.oldState} to ${event.newState}, after the state moved`)
  }

  const chosen = (event: CustomEvent<{ value: string }>) => {
    say('helix-select', `"${event.detail.value}" was chosen, which bubbles`)
  }

  return (
    <helix-flex direction="column" gap="md">
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
          <helix-icon-button label="New file" value="new" />
          <helix-icon-button label="Upload" value="upload" />
        </helix-speed-dial>
      </div>

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
