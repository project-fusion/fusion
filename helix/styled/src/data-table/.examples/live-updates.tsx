import { useState } from 'react'

const SERVICES = [
  { id: 'checkout', latency: 182, name: 'Checkout API', status: 'Healthy' },
  { id: 'search', latency: 944, name: 'Search indexer', status: 'Slow' },
  { id: 'auth', latency: 61, name: 'Auth gateway', status: 'Healthy' },
  { id: 'billing', latency: 230, name: 'Billing worker', status: 'Healthy' },
  { id: 'media', latency: 340, name: 'Media resizer', status: 'Healthy' },
  { id: 'mail', latency: 128, name: 'Mail relay', status: 'Healthy' },
]

export function Example() {
  const [services, setServices] = useState(SERVICES)
  const [presses, setPresses] = useState(0)

  // Set `rows` again, as a fetch would. Every row is a new object, and only
  // the rows whose values changed light up.
  const refresh = () => {
    const next = presses + 1
    setPresses(next)
    setServices((before) =>
      before.map((row, place) => {
        if ((place + next) % 3 !== 0) {
          return { ...row }
        }
        const drift = 20 + ((place * 53 + next * 37) % 160)
        const latency = row.latency > 300 ? row.latency - drift : row.latency + drift
        return { ...row, latency, status: latency > 400 ? 'Slow' : 'Healthy' }
      }),
    )
  }

  return (
    <helix-data-table
      flash-changes
      label="Services"
      row-key="id"
      rows={services}
    >
      <helix-button
        onClick={refresh}
        slot="toolbar"
      >
        Refresh latencies
      </helix-button>
      <helix-table-column
        field="name"
        row-header
      >
        Service
      </helix-table-column>
      <helix-table-column field="status">Status</helix-table-column>
      <helix-table-column
        field="latency"
        text-align="end"
        type="number"
      >
        Latency (ms)
      </helix-table-column>
    </helix-data-table>
  )
}
