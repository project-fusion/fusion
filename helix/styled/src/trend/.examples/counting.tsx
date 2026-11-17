import { useState } from 'react'

export function Example() {
  const [revenue, setRevenue] = useState(48200)
  const [change, setChange] = useState(0.124)

  // Set new values, and each counts to its own from the one before.
  const refresh = () => {
    const next = Math.round(revenue * (0.85 + Math.random() * 0.3))
    setChange(Math.round(((next - revenue) / revenue) * 1000) / 1000)
    setRevenue(next)
  }

  return (
    <helix-flex
      align-items="start"
      direction="column"
      gap="md"
    >
      <helix-stat value={revenue}>
        <span slot="label">Revenue this week</span>
        <helix-trend
          formatOptions={{ maximumFractionDigits: 1, style: 'percent' }}
          good="up"
          locale="en-US"
          slot="trend"
          value={change}
        >
          <span slot="label">on last week</span>
        </helix-trend>
      </helix-stat>
      <helix-button onClick={refresh}>Refresh</helix-button>
    </helix-flex>
  )
}
