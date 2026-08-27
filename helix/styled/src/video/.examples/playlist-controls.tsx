import { useState } from 'react'

export function Example() {
  /* Preview frame: a real page would swap the source for the next one. */
  const [label, setLabel] = useState('One of several')

  return (
    <helix-video
      extra-controls="previous next"
      label={label}
      onhelix-next={() => setLabel('Asked for the next one')}
      onhelix-previous={() => setLabel('Asked for the previous one')}
      src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4"
    />
  )
}
