import { useState } from 'react'

export function Example() {
  const [active, setActive] = useState('details')

  return (
    <helix-steps
      active={active}
      onhelix-before-activate={(event) => setActive(event.detail.value)}
    >
      <helix-step value="account">Account</helix-step>
      <helix-step value="details">Details</helix-step>
      <helix-step value="review">Review</helix-step>
    </helix-steps>
  )
}
