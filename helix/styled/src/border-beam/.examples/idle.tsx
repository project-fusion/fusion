import { useState } from 'react'

export function Example() {
  const [idle, setIdle] = useState(false)

  // `idle` takes the light away while nothing is running.
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-border-beam idle={idle}>
        <helix-card separation="outlined">
          {idle ? 'Sync stopped.' : 'Syncing two of five folders.'}
        </helix-card>
      </helix-border-beam>

      <helix-button onClick={() => setIdle(!idle)}>
        {idle ? 'Start syncing' : 'Stop syncing'}
      </helix-button>
    </helix-flex>
  )
}
