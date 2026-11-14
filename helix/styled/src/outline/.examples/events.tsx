import { useState } from 'react'

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
      ></helix-outline>

      <helix-scroll-area
        label="Reading"
        max-block-size="sm"
      >
        <helix-flex
          direction="column"
          gap="3xl"
        >
          <helix-outline-section
            anchor="install"
            label="Install"
          >
            <helix-text
              as="h2"
              scale="title"
            >
              Install
            </helix-text>
            <helix-text as="p">Add the package to your project.</helix-text>
          </helix-outline-section>
          <helix-outline-section
            anchor="usage"
            label="Usage"
          >
            <helix-text
              as="h2"
              scale="title"
            >
              Usage
            </helix-text>
            <helix-text as="p">Create a client with your API key.</helix-text>
          </helix-outline-section>
          <helix-outline-section
            anchor="api"
            label="API"
          >
            <helix-text
              as="h2"
              scale="title"
            >
              API
            </helix-text>
            <helix-text as="p">Each method lists its parameters.</helix-text>
          </helix-outline-section>
        </helix-flex>
      </helix-scroll-area>

      <helix-list
        divided
        label="Events"
      >
        {heard.map((one, at) => (
          <helix-list-item key={`${one.name}-${at}`}>
            {one.name}
            <helix-text slot="description">{one.carried}</helix-text>
          </helix-list-item>
        ))}
      </helix-list>
    </helix-flex>
  )
}
