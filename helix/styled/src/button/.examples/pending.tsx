import { useState } from 'react'

// The time the pretend request takes.
const WAIT = 2000

export function Example() {
  const [pending, setPending] = useState(false)

  const save = () => {
    setPending(true)
    setTimeout(() => setPending(false), WAIT)
  }

  return (
    <helix-button
      emphasis="solid"
      onClick={save}
      pending={pending}
      pending-label="Saving"
      tone="primary"
    >
      Save changes
    </helix-button>
  )
}
