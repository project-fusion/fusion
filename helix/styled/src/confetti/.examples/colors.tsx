import type { HelixConfetti } from '@fusion.dev/helix'
import { useRef, useState } from 'react'
import './colors.css'

export function Example() {
  const confetti = useRef<HelixConfetti>(null)
  const [said, setSaid] = useState('')

  const finish = () => {
    setSaid('Your workspace is ready.')
    void confetti.current?.burst()
  }

  return (
    <helix-flex
      align-items="center"
      direction="column"
      gap="sm"
    >
      <helix-confetti
        className="brand"
        ref={confetti}
      >
        <helix-button
          emphasis="solid"
          onClick={finish}
        >
          Finish setup
        </helix-button>
      </helix-confetti>
      <span role="status">{said}</span>
    </helix-flex>
  )
}
