import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Move between the tabs', name: 'Nothing yet' }]

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
      say('helix-before-activate', 'refused, so the strip did not move')
      return
    }
    say('helix-before-activate', `moving to "${event.detail.value}"`)
  }

  const chosen = (event: CustomEvent<{ value: string }>) => {
    say('helix-select', `"${event.detail.value}" was chosen, which a container can catch`)
  }

  return (
    <helix-flex direction="column" gap="md">
      <helix-tabs
        default-active="usage"
        label="Account"
        onhelix-before-activate={moving}
        onhelix-select={chosen}
      >
        <helix-tabs-tab value="usage">Usage</helix-tabs-tab>
        <helix-tabs-tab value="billing">Billing</helix-tabs-tab>
        <helix-tabs-tab value="danger">Danger</helix-tabs-tab>
        <helix-tabs-panel slot="panels" value="usage">
          Requests, storage and egress.
        </helix-tabs-panel>
        <helix-tabs-panel slot="panels" value="billing">
          Invoices and the card on file.
        </helix-tabs-panel>
        <helix-tabs-panel slot="panels" value="danger">
          Nothing reaches here.
        </helix-tabs-panel>
      </helix-tabs>

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
