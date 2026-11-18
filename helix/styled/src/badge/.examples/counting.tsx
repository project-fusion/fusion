import { useState } from 'react'

export function Example() {
  const [count, setCount] = useState(3)

  // A new count swells the badge, and the button's name says the count.
  return (
    <helix-flex
      align-items="center"
      gap="lg"
    >
      <helix-badge value={String(count)}>
        <helix-button aria-label={`Inbox, ${count} unread`}>Inbox</helix-button>
      </helix-badge>
      <helix-button onClick={() => setCount((before) => before + 1)}>
        Receive a message
      </helix-button>
    </helix-flex>
  )
}
