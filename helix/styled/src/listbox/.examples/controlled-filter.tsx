import { useState } from 'react'

export function Example() {
  const [filter, setFilter] = useState('e')

  return (
    <helix-listbox
      filter={filter}
      label="Time zone"
      onhelix-filter={(event) => setFilter(event.detail.value)}
    >
      <helix-option value="lisbon">Europe/Lisbon</helix-option>
      <helix-option value="london">Europe/London</helix-option>
      <helix-option value="berlin">Europe/Berlin</helix-option>
    </helix-listbox>
  )
}
