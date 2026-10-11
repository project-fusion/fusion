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
  const line = useRef('')
  const history = useRef<string[]>([])
  const place = useRef(0)
  const draft = useRef('')

  const show = (next: string) => {
    line.current = next
    void shell.current?.write(`\x1b[2K\r${PROMPT}${next}`)
  }

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
          // No process is connected here, so the example keeps the line you type and
          // writes it back: Backspace takes away only what you typed, and Up and Down
          // bring back the lines you entered, as a shell's history does.
          const { data } = event.detail
          if (data === '\r') {
            if (line.current !== '') {
              history.current.push(line.current)
            }
            place.current = history.current.length
            line.current = ''
            void shell.current?.write(`\r\n${PROMPT}`)
          } else if (data === '\x1b[A' || data === '\x1bOA') {
            if (place.current > 0) {
              if (place.current === history.current.length) {
                draft.current = line.current
              }
              place.current -= 1
              show(history.current[place.current] ?? '')
            }
          } else if (data === '\x1b[B' || data === '\x1bOB') {
            if (place.current < history.current.length) {
              place.current += 1
              show(
                place.current === history.current.length
                  ? draft.current
                  : (history.current[place.current] ?? ''),
              )
            }
          } else if (data === '\x7f') {
            if (line.current !== '') {
              line.current = [...line.current].slice(0, -1).join('')
              void shell.current?.write('\b \b')
            }
          } else if (!data.startsWith('\x1b')) {
            const typed = [...data]
              .filter((character) => character >= ' ' && character !== '\x7f')
              .join('')
            line.current += typed
            void shell.current?.write(typed)
          }
        }}
        ref={shell}
      >
        <div data-preview-terminal-canvas />
      </helix-terminal>
    </>
  )
}
