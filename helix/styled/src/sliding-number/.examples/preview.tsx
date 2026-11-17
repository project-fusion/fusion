import { useState } from 'react'

export function Example() {
  const [sales, setSales] = useState(1284)

  // Set a new value and each digit that changes rolls to its new figure.
  const sell = () => setSales((before) => before + 1 + Math.floor(Math.random() * 20))

  return (
    <helix-flex
      align-items="start"
      direction="column"
      gap="md"
    >
      <helix-text scale="display">
        <helix-sliding-number value={sales}></helix-sliding-number>
      </helix-text>

      <helix-button onClick={sell}>Add a sale</helix-button>
    </helix-flex>
  )
}
