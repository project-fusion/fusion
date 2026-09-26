import { useState } from 'react'

export function Example() {
  /* The preview changes only the label. Your code loads the next video here. */
  const [label, setLabel] = useState('Lesson 2 of 5')

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
