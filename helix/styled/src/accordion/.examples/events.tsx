import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The number of rows the log keeps.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Open a section, then another', name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  /* Lifecycle events do not bubble, so each section gets its own handlers. */
  const opening = (name: string) => () => {
    say('helix-before-open', `${name} is about to open (cancelable)`)
  }

  const closing = (name: string) => () => {
    say('helix-before-close', `${name} is about to close (cancelable)`)
  }

  const moved = (name: string) => (event: Event & { newState?: string; oldState?: string }) => {
    say('toggle', `${name} went ${event.oldState} to ${event.newState}`)
  }

  const SECTIONS = [
    { body: 'Each push to the main branch starts a new deployment.', name: 'Deployment' },
    { body: 'Invoices are issued on the first of the month.', name: 'Billing' },
  ]

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-accordion>
        {SECTIONS.map((section) => (
          <helix-accordion-item
            key={section.name}
            onhelix-before-close={closing(section.name)}
            onhelix-before-open={opening(section.name)}
            onToggle={moved(section.name)}
          >
            <span slot="summary">{section.name}</span>
            {section.body}
          </helix-accordion-item>
        ))}
      </helix-accordion>

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
