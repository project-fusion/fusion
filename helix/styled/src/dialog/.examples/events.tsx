import { useRef, useState } from 'react'

type Arrival = { carried: string; name: string }

const RESTING: Arrival[] = [{ carried: 'Open it, then try to close it twice', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)
  const refused = useRef(false)

  const say = (name: string, carried: string) =>
    setHeard((before) => [...(before === RESTING ? [] : before), { carried, name }].slice(-6))

  return (
    <helix-flex direction="column" gap="md">
      <helix-button command="--show" commandfor="unsaved" emphasis="solid" tone="primary">
        Open
      </helix-button>

      <helix-dialog
        id="unsaved"
        label="Unsaved work"
        onClose={() => say('close', 'the platform name, once it is shut')}
        onhelix-before-close={(event) => {
          if (refused.current) {
            say('helix-before-close', 'let through this time')
            return
          }
          refused.current = true
          event.preventDefault()
          say('helix-before-close', 'refused, so nothing moved')
        }}
        onhelix-before-open={() => say('helix-before-open', 'about to open, refusable')}
        onToggle={(event) =>
          say('toggle', `${event.oldState} to ${event.newState}, after the state moved`)
        }
      >
        <helix-text>There are changes that have not been written yet.</helix-text>
        <helix-button command="--close" commandfor="unsaved" slot="footer">
          Close
        </helix-button>
      </helix-dialog>

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
