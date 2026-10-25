import { useState } from 'react'

export function Example() {
  const [checked, setChecked] = useState(true)

  return (
    <helix-checkbox
      checked={checked}
      label="I accept the terms of service"
      onhelix-before-check={(event) => setChecked(event.detail.checked)}
    />
  )
}
