import type { HelixConfetti } from '@fusion.dev/helix'
import { useRef, useState } from 'react'

export function Example() {
  const confetti = useRef<HelixConfetti>(null)
  const [said, setSaid] = useState('')

  // Burst once the action is done, and say so in words as well.
  const publish = () => {
    setSaid('Your page is published.')
    void confetti.current?.burst()
  }

  return (
    <helix-flex
      align-items="center"
      direction="column"
      gap="sm"
    >
      <helix-confetti ref={confetti}>
        <helix-button
          emphasis="solid"
          onClick={publish}
        >
          Publish page
        </helix-button>
      </helix-confetti>
      <span role="status">{said}</span>
    </helix-flex>
  )
}
