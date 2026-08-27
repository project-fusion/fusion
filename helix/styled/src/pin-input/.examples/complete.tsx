import { useState } from 'react'

export function Example() {
  /* Preview frame: a real page would post the code and act on the answer.
     `helix-complete` is what saves a reader pressing anything: the last box is
     the last thing they have to do, so a submit button beside it would be a
     control that is only ever pressed after the work is already finished. */
  const [hint, setHint] = useState('Sent to your phone')

  return (
    <helix-pin-input
      hint={hint}
      label="Verification code"
      onhelix-complete={(event) => setHint(`Checking ${event.detail.value}`)}
    />
  )
}
