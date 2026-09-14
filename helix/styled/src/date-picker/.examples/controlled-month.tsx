import { useState } from 'react'

export function Example() {
  const [month, setMonth] = useState('2026-12')

  return (
    <helix-date-picker
      month={month}
      onhelix-navigate={(event) => setMonth(event.detail.value)}
    />
  )
}
