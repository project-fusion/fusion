import { useState } from 'react'

export function Example() {
  const [index, setIndex] = useState(1)

  return (
    <helix-carousel
      index={index}
      label="Setup steps"
      onhelix-select={(event) => setIndex(Number(event.detail.value))}
    >
      <div>Create an account</div>
      <div>Invite your team</div>
      <div>Choose a plan</div>
    </helix-carousel>
  )
}
