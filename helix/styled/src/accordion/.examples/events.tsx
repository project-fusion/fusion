import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Open a section, then another', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  /* One handler per section, because lifecycle events do not bubble and are not
     composed: put these on the accordion and nothing arrives. Overlays nest, and
     an inner one closing must never read as the outer one closing. */
  const opening = (name: string) => () => {
    say('helix-before-open', `${name} is about to open, and this is refusable`)
  }

  const closing = (name: string) => () => {
    say('helix-before-close', `${name} is about to close, and this is refusable`)
  }

  const moved = (name: string) => (event: Event & { newState?: string; oldState?: string }) => {
    say('toggle', `${name} went ${event.oldState} to ${event.newState}`)
  }

  const SECTIONS = [
    { body: 'Every push to main builds and promotes.', name: 'Deployment' },
    { body: 'Invoices are issued on the first of the month.', name: 'Billing' },
  ]

  return (
    <helix-flex direction="column" gap="md">
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
