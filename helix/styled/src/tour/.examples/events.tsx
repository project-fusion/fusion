import { useState } from 'react'
import './events.css'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 8

const RESTING: Arrival[] = [{ carried: 'Step through it, then skip', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const asked = (event: CustomEvent<{ what: string }>) => {
    say('helix-tour-ask', `a stop asked to go ${event.detail.what}, which is not the decision`)
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-activate', `proposing stop ${event.detail.value}, refusable`)
  }

  const leaving = () => {
    say('helix-before-close', 'leaving early, which is refusable')
  }

  const finished = () => {
    say('helix-complete', 'the last stop was reached, which is not refusable')
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <div className="stage">
        <helix-button id="anchor">The thing being explained</helix-button>
      </div>

      <helix-tour
        onhelix-before-activate={proposed}
        onhelix-before-close={leaving}
        onhelix-complete={finished}
        onhelix-tour-ask={asked}
        open
      >
        <helix-tour-stop for="anchor">This is where a deploy starts.</helix-tour-stop>
        <helix-tour-stop for="anchor">And this is where it is watched.</helix-tour-stop>
      </helix-tour>

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
