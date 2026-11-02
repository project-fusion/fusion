import type { HelixInput } from '@fusion.dev/helix'
import { useEffect, useRef } from 'react'

export function Example() {
  const email = useRef<HelixInput>(null)

  useEffect(() => {
    const input = email.current
    input?.updateComplete.then(() => input.focus())
  }, [])

  return (
    <helix-input
      label="Email"
      placeholder="name@example.com"
      ref={email}
      type="email"
    ></helix-input>
  )
}
