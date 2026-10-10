import type { HelixLog } from '@fusion.dev/helix'
import { useEffect, useRef } from 'react'

type Step = {
  duration?: string
  heading: string
  id: string
  open: boolean
  status: 'done' | 'failed' | 'running'
}

const OUTPUT = [
  '::group::Install dependencies',
  '\x1b[2m$ bun install\x1b[0m',
  'Downloading 12%\rDownloading 48%\rDownloading 100%',
  'Resolved 1,214 packages in 2.1s',
  '\x1b[33mwarn\x1b[0m glob@7.2.3 is deprecated',
  '::endgroup::38s',
  '::group::Test',
  '\x1b[2m$ bun test\x1b[0m',
  '\x1b[32m✓\x1b[0m core \x1b[2m(412 specs)\x1b[0m',
  '\x1b[32m✓\x1b[0m headless \x1b[2m(634 specs)\x1b[0m',
  '\x1b[31m✗\x1b[0m styled/button \x1b[2m(1 failed)\x1b[0m',
  '::error::expected the label "Save changes" to stay on one line',
  '::endgroup::1m 31s',
]

export function Example() {
  const log = useRef<HelixLog>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  // The steps read so far, and the one being written.
  const steps = useRef<{ current?: string | undefined; groups: Step[] }>({ groups: [] })

  useEffect(() => {
    const element = log.current
    if (!element) {
      return
    }

    // Reads the markers a CI runner writes: a group opens and closes a step,
    // and an error marks its line.
    element.parse = (text: string) => {
      let { current, groups } = steps.current
      if (text.startsWith('::group::')) {
        current = `step-${groups.length}`
        groups = [...groups, { heading: text.slice(9), id: current, open: true, status: 'running' }]
        element.groups = groups
        steps.current = { current, groups }
        return null
      }
      if (text.startsWith('::endgroup::')) {
        groups = groups.map((group) =>
          group.id === current
            ? {
                ...group,
                duration: text.slice(12),
                open: group.status === 'failed',
                status: group.status === 'failed' ? 'failed' : 'done',
              }
            : group,
        )
        element.groups = groups
        steps.current = { groups }
        return null
      }
      if (text.startsWith('::error::')) {
        groups = groups.map((group) =>
          group.id === current ? { ...group, status: 'failed' } : group,
        )
        element.groups = groups
        steps.current = { current, groups }
        return current
          ? { group: current, level: 'error', text: text.slice(9) }
          : { level: 'error', text: text.slice(9) }
      }
      return current ? { group: current } : undefined
    }
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
    steps.current = { groups: [] }
    element.groups = []
    element.clear()
    element.done = false
    // With reduced motion, the whole run is written at once.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
      label="CI run"
      line-numbers
      ref={log}
    >
      <helix-flex
        data-density="sm"
        justify-content="end"
        slot="toolbar"
      >
        <helix-button onClick={again}>Run again</helix-button>
      </helix-flex>
    </helix-log>
  )
}
