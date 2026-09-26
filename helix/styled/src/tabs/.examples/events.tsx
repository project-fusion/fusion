import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps this many of the most recent rows.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Move between the tabs', name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const moving = (event: CustomEvent<{ value: string }>) => {
    if (event.detail.value === 'danger') {
      event.preventDefault()
      say('helix-before-activate', 'canceled, so the active tab did not change')
      return
    }
    say('helix-before-activate', `moving to "${event.detail.value}"`)
  }

  const chosen = (event: CustomEvent<{ value: string }>) => {
    say('helix-select', `"${event.detail.value}" was chosen, and the event bubbles`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-tabs
        default-active="usage"
        label="Account"
        onhelix-before-activate={moving}
        onhelix-select={chosen}
      >
        <helix-tab value="usage">Usage</helix-tab>
        <helix-tab value="billing">Billing</helix-tab>
        <helix-tab value="danger">Advanced</helix-tab>
        <helix-tab-panel
          slot="panels"
          value="usage"
        >
          Requests, storage, and bandwidth.
        </helix-tab-panel>
        <helix-tab-panel
          slot="panels"
          value="billing"
        >
          Invoices and the payment method on file.
        </helix-tab-panel>
        <helix-tab-panel
          slot="panels"
          value="danger"
        >
          Transfer or delete your account.
        </helix-tab-panel>
      </helix-tabs>

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
