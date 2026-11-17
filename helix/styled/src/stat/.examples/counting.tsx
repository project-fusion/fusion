import { useState } from 'react'

export function Example() {
  const [readers, setReaders] = useState(12480)
  const [uptime, setUptime] = useState(98.2)

  // Set a new value and the figure counts to it from the one before.
  const refresh = () => {
    setReaders((before) => Math.round(before * (0.85 + Math.random() * 0.3)))
    setUptime(Math.round((95 + Math.random() * 5) * 10) / 10)
  }

  return (
    <>
      <helix-stat-group divided>
        <helix-stat value={readers}>
          <span slot="label">Monthly readers</span>
        </helix-stat>
        <helix-stat
          formatOptions={{ maximumFractionDigits: 1 }}
          value={uptime}
        >
          <span slot="label">Uptime</span>
          <span slot="unit">%</span>
        </helix-stat>
      </helix-stat-group>

      <helix-button onClick={refresh}>Refresh</helix-button>
    </>
  )
}
