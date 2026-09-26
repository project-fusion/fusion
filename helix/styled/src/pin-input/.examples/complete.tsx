import { useState } from 'react'

export function Example() {
  /* Preview frame: your page would send the code to your server here.
     `helix-complete` is sent when the last box is filled. */
  const [hint, setHint] = useState('Sent to your phone')

  return (
    <helix-pin-input
      hint={hint}
      label="Verification code"
      onhelix-complete={(event) => setHint(`Checking ${event.detail.value}`)}
    />
  )
}
