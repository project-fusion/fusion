import type { HelixTerminal } from '@fusion.dev/helix'
import { useEffect, useRef } from 'react'

const OUTPUT = [
  '\x1b[2m$\x1b[0m bun run build',
  '\x1b[1m•\x1b[0m Packages in scope: @fusion.dev/helix, @fusion.dev/helix-terminal',
  '\x1b[1m•\x1b[0m Running build in 2 packages',
  '@fusion.dev/helix-core:build: \x1b[32mcache hit\x1b[0m, replaying logs',
  '@fusion.dev/helix-headless:build: \x1b[33mcache miss\x1b[0m, executing 94d764012ba0baf6',
  '@fusion.dev/helix-terminal:build: \x1b[33mcache miss\x1b[0m, executing 5f0a8bc9ef793b57',
  '',
  ' \x1b[1mTasks:\x1b[0m    \x1b[32m16 successful\x1b[0m, 16 total',
  '\x1b[1mCached:\x1b[0m    11 cached, 16 total',
  '  \x1b[1mTime:\x1b[0m    1m5.414s',
]

export function Example() {
  const transcript = useRef<HelixTerminal>(null)

  useEffect(() => {
    void transcript.current?.write(OUTPUT.join('\r\n'))
  }, [])

  return (
    <>
      {/* Preview frame: data-preview-terminal has the frame connect xterm.js; on your page, connectTerminal does. */}
      <helix-terminal
        controls="find copy"
        data-preview-terminal
        label="bun run build"
        readonly
        ref={transcript}
      >
        <div data-preview-terminal-canvas />
      </helix-terminal>
    </>
  )
}
