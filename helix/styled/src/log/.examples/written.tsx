import type { HelixLog } from '@fusion.dev/helix'
import { useEffect, useRef } from 'react'

const OUTPUT = [
  '2026-10-09T14:02:00.0000000Z ##[group]Install dependencies',
  '2026-10-09T14:02:00.1000000Z \x1b[2m$ bun install\x1b[0m',
  'Downloading 12%\rDownloading 48%\rDownloading 100%',
  '2026-10-09T14:02:36.4000000Z Resolved 1,214 packages in 2.1s',
  '2026-10-09T14:02:37.0000000Z ##[warning]glob@7.2.3 is deprecated',
  '2026-10-09T14:02:38.0000000Z ##[endgroup]',
  '2026-10-09T14:02:39.0000000Z ##[group]Test',
  '2026-10-09T14:02:39.2000000Z \x1b[2m$ bun test\x1b[0m',
  '2026-10-09T14:03:10.0000000Z \x1b[32m✓\x1b[0m core \x1b[2m(412 specs)\x1b[0m',
  '2026-10-09T14:03:52.0000000Z \x1b[32m✓\x1b[0m headless \x1b[2m(634 specs)\x1b[0m',
  '2026-10-09T14:04:09.0000000Z \x1b[31m✗\x1b[0m styled/button \x1b[2m(1 failed)\x1b[0m',
  '2026-10-09T14:04:10.0000000Z ##[error]expected the label "Save changes" to stay on one line',
  '2026-10-09T14:04:10.0000000Z ##[endgroup]',
]

export function Example() {
  const log = useRef<HelixLog>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const element = log.current
    if (!element) {
      return
    }
    element.clear()
    element.write(`${OUTPUT.join('\n')}\n`)
    element.done = true
    return () => clearTimeout(timer.current)
  }, [])

  const again = () => {
    const element = log.current
    if (!element) {
      return
    }
    clearTimeout(timer.current)
    element.clear()
    element.done = false
    // With reduced motion, the whole run is written at once.
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      element.write(`${OUTPUT.join('\n')}\n`)
      element.done = true
      return
    }
    let at = 0
    const next = () => {
      element.write(`${OUTPUT[at]}\n`)
      at += 1
      if (at < OUTPUT.length) {
        timer.current = setTimeout(next, 180)
      } else {
        element.done = true
      }
    }
    next()
  }

  return (
    <helix-log
      format="github-actions"
      label="CI run"
      line-numbers
      ref={log}
    >
      <helix-flex
        align-items="center"
        justify-content="between"
        slot="toolbar"
      >
        <helix-text scale="body-strong">Test and build on main</helix-text>
        <helix-button onClick={again}>Run again</helix-button>
      </helix-flex>
    </helix-log>
  )
}
