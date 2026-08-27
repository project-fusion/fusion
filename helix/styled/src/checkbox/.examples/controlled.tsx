import { useState } from 'react'

export function Example() {
  const [checked, setChecked] = useState(true)

  return (
    <helix-checkbox
      checked={checked}
      label="Label"
      onhelix-before-toggle={(event) => setChecked(event.detail.checked)}
    />
  )
}
