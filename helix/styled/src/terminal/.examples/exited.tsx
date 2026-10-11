import type { HelixTerminal } from '@fusion.dev/helix'
import { useEffect, useRef, useState } from 'react'

const OUTPUT = [
  '\x1b[2m$\x1b[0m bun run dev',
  '\x1b[36m▲ Next.js 16.2.0\x1b[0m',
  '- Local: http://localhost:3000',
  '\x1b[31m⨯\x1b[0m Port 3000 is in use, and \x1b[1mnext dev\x1b[0m could not start.',
  '',
]

export function Example() {
  const dev = useRef<HelixTerminal>(null)
  const [exitCode, setExitCode] = useState<number | undefined>(1)

  useEffect(() => {
    void dev.current?.write(OUTPUT.join('\r\n'))
  }, [])

  return (
    <>
      {/* Preview frame: data-preview-terminal has the frame connect xterm.js; on your page, connectTerminal does. */}
      <helix-terminal
        data-preview-terminal
        exitCode={exitCode}
        label="bun run dev"
        onhelix-terminal-restart={() => {
          // Start your process again, clear the exit code, and write its output.
          setExitCode(undefined)
          dev.current?.reset()
          void dev.current?.write(OUTPUT.join('\r\n'))
          setExitCode(1)
        }}
        ref={dev}
      >
        <div data-preview-terminal-canvas />
      </helix-terminal>
    </>
  )
}
