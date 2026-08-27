import { useState } from 'react'
import './events.css'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [
  { carried: 'Scroll the panel, or press a heading', name: 'Nothing yet' },
]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const reading = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-activate', `"${event.detail.value}" is the one being read`)
  }

  return (
    <helix-flex direction="column" gap="md">
      <helix-outline label="On this page" onhelix-before-activate={reading}>
        <a href="#install">Install</a>
        <a href="#usage">Usage</a>
        <a href="#api">API</a>
      </helix-outline>

      <div className="reading">
        <section id="install">
          <h2>Install</h2>Add the package and import the stylesheet.
        </section>
        <section id="usage">
          <h2>Usage</h2>Write the tag and give it a label.
        </section>
        <section id="api">
          <h2>API</h2>Every property is on the reference page.
        </section>
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
