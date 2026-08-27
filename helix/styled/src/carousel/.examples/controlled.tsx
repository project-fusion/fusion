import { useState } from 'react'

export function Example() {
  const [index, setIndex] = useState(1)

  return (
    <helix-carousel
      index={index}
      label="Screens"
      onhelix-select={(event) => setIndex(event.detail.index)}
    >
      <div>First</div>
      <div>Second</div>
      <div>Third</div>
    </helix-carousel>
  )
}
