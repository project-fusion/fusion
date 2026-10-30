import type { HelixTerminal } from '@fusion.dev/helix'
import { useEffect, useRef } from 'react'

const PROMPT = '\x1b[36m~/project\x1b[0m \x1b[32m❯\x1b[0m '

const OUTPUT = [
  `${PROMPT}ls`,
  'src  package.json',
  `${PROMPT}bun run dev`,
  '\x1b[32mready\x1b[0m on http://localhost:3000',
  PROMPT,
]

export function Example() {
  const plain = useRef<HelixTerminal>(null)

  useEffect(() => {
    void plain.current?.write(OUTPUT.join('\r\n'))
  }, [])

  return (
    <>
      {/* Preview frame: data-preview-terminal has the frame connect xterm.js; on your page, connectTerminal does. */}
      <helix-terminal
        controls="none"
        data-preview-terminal
        ref={plain}
      >
        <div data-preview-terminal-canvas />
      </helix-terminal>
    </>
  )
}
