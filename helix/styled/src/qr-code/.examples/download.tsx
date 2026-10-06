import type { HelixQrCode } from '@fusion.dev/helix'
import { useRef } from 'react'

export function Example() {
  const code = useRef<HelixQrCode>(null)

  return (
    <helix-flex
      align-items="center"
      direction="column"
      gap="sm"
    >
      <helix-qr-code
        label="Documentation website"
        ref={code}
        value="https://fusion.dev/helix"
      ></helix-qr-code>
      <helix-button onClick={() => code.current?.download('helix-docs.png')}>
        Download the code
      </helix-button>
    </helix-flex>
  )
}
