import { useState } from 'react'

export function Example() {
  const [value, setValue] = useState(42)

  // Set a new value and the reading counts to it as the fill moves.
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-meter
        label="Disk used"
        show-value
        value={value}
      ></helix-meter>
      <helix-button onClick={() => setValue(10 + Math.round(Math.random() * 85))}>
        Measure again
      </helix-button>
    </helix-flex>
  )
}
