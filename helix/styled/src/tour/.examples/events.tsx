import { useState } from 'react'
import './events.css'

type Arrival = { carried: string; name: string }

// The log keeps this many of the most recent rows.
const KEEP = 8

const RESTING: Arrival[] = [{ carried: 'Go through the tour, then skip it', name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const asked = (event: CustomEvent<{ what: string }>) => {
    say('helix-tour-ask', `a stop requested ${event.detail.what}`)
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-activate', `about to change to stop ${event.detail.value}, can be canceled`)
  }

  const leaving = () => {
    say('helix-before-close', 'closing early, can be canceled')
  }

  const finished = () => {
    say('helix-complete', 'the tour was finished, cannot be canceled')
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <div className="stage">
        <helix-button id="anchor">Create project</helix-button>
      </div>

      <helix-tour
        onhelix-before-activate={proposed}
        onhelix-before-close={leaving}
        onhelix-complete={finished}
        onhelix-tour-ask={asked}
        open
      >
        <helix-tour-stop for="anchor">Create a project to get started.</helix-tour-stop>
        <helix-tour-stop for="anchor">Name the project and invite your team.</helix-tour-stop>
      </helix-tour>

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
