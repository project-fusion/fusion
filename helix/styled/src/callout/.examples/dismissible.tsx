import { useState } from 'react'

export function Example() {
  const [shown, setShown] = useState(true)

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      {shown ? (
        <helix-callout
          dismissible
          onhelix-dismiss={() => setShown(false)}
          tone="neutral"
        >
          <helix-text slot="heading">Tip</helix-text>
          Press the slash key to search from anywhere.
        </helix-callout>
      ) : null}
      <helix-button>Open settings</helix-button>
    </helix-flex>
  )
}
