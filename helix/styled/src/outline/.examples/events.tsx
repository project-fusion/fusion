import { useState } from 'react'
import './events.css'

type Arrival = { carried: string; name: string }

// The log keeps the last six events.
const KEEP = 6

const RESTING: Arrival[] = [
  { carried: 'Scroll the panel, or press a heading', name: 'No events yet' },
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
    say('helix-activate', `Section "${event.detail.value}" is in view`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-outline
        label="On this page"
        onhelix-activate={reading}
      >
        <a href="#install">Install</a>
        <a href="#usage">Usage</a>
        <a href="#api">API</a>
      </helix-outline>

      <div className="reading">
        <section id="install">
          <h2>Install</h2>Add the package to your project.
        </section>
        <section id="usage">
          <h2>Usage</h2>Create a client with your API key.
        </section>
        <section id="api">
          <h2>API</h2>Each method lists its parameters.
        </section>
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
