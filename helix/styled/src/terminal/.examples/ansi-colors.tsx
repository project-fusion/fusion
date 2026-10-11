import type { HelixTerminal } from '@fusion.dev/helix'
import { useEffect, useRef } from 'react'

const NAMES = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']
const SETS: [string, number][] = [
  ['Text', 30],
  ['Bright text', 90],
  ['Grounds', 40],
  ['Bright grounds', 100],
]

const lines: string[] = []
for (const [heading, base] of SETS) {
  lines.push(`\x1b[1m${heading}\x1b[0m`)
  for (const half of [0, 4]) {
    lines.push(
      NAMES.slice(half, half + 4)
        .map((name, at) => `\x1b[${base + half + at}m ${name.padEnd(8)}\x1b[0m`)
        .join(' '),
    )
  }
}

export function Example() {
  const colors = useRef<HelixTerminal>(null)

  useEffect(() => {
    void colors.current?.write(lines.join('\r\n'))
  }, [])

  return (
    <>
      {/* Preview frame: data-preview-terminal has the frame connect xterm.js; on your page, connectTerminal does. */}
      <helix-terminal
        controls="none"
        data-preview-terminal
        label="ANSI colors"
        readonly
        ref={colors}
      >
        <div data-preview-terminal-canvas />
      </helix-terminal>
    </>
  )
}
