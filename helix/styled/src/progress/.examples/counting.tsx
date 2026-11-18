import { useState } from 'react'

export function Example() {
  const [value, setValue] = useState(24)

  // Set a new value and the number counts to it as the bar fills.
  const advance = () =>
    setValue((before) =>
      before >= 100 ? 0 : Math.min(100, before + 20 + Math.round(Math.random() * 20)),
    )

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-progress
        label="Uploading files"
        show-value
        value={value}
      ></helix-progress>
      <helix-button onClick={advance}>Advance</helix-button>
    </helix-flex>
  )
}
