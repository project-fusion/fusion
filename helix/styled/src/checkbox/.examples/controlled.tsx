import { useState } from 'react'

export function Example() {
  const [checked, setChecked] = useState(true)

  return (
    <helix-checkbox
      checked={checked}
      label="I accept the terms of service"
      onhelix-before-toggle={(event) => setChecked(event.detail.checked)}
    />
  )
}
