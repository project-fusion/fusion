import type { HelixTerminal } from '@fusion.dev/helix'
import { useEffect, useRef } from 'react'

const PROMPT = '\x1b[36m~/fusion\x1b[0m \x1b[35mmain\x1b[0m \x1b[32m❯\x1b[0m '

const OUTPUT = [
  `${PROMPT}git status --short`,
  ' \x1b[31mM\x1b[0m helix/styled/src/terminal/root/terminal-root.css',
  '\x1b[31m??\x1b[0m helix/terminal/',
  `${PROMPT}bun test`,
  '\x1b[1mbun test\x1b[0m \x1b[2mv1.3.0\x1b[0m',
  '\x1b[32m✓\x1b[0m terminal output \x1b[2m> is held until a renderer is attached\x1b[0m',
  '\x1b[32m✓\x1b[0m terminal input \x1b[2m> reaches the page as helix-terminal-input\x1b[0m',
  '\x1b[31m✗\x1b[0m the find bar \x1b[2m> says the count\x1b[0m',
  '',
  ' \x1b[32m23 pass\x1b[0m',
  ' \x1b[31m1 fail\x1b[0m',
  PROMPT,
]

export function Example() {
  const shell = useRef<HelixTerminal>(null)

  useEffect(() => {
    void shell.current?.write(OUTPUT.join('\r\n'))
  }, [])

  return (
    <>
      {/* Preview frame: data-preview-terminal has the frame connect xterm.js; on your page, connectTerminal does. */}
      <helix-terminal
        data-preview-terminal
        label="~/fusion"
        onhelix-terminal-input={(event) => {
          // No process is connected here, so the example writes back what you type.
          const { data } = event.detail
          void shell.current?.write(
            data === '\r' ? `\r\n${PROMPT}` : data === '\x7f' ? '\b \b' : data,
          )
        }}
        ref={shell}
      >
        <div data-preview-terminal-canvas />
      </helix-terminal>
    </>
  )
}
