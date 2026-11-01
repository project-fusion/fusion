import type { HelixLog, HelixSelect } from '@fusion.dev/helix'
import { useEffect, useRef, useState } from 'react'

// Four of these are the same line written again, which `collapse` folds.
const LINES: HelixLog['lines'] = [
  { level: 'info', text: 'Ready on http://localhost:5173 in 412 ms' },
  { level: 'debug', text: 'Watching 1,204 files under src' },
  { level: 'log', text: 'Page reload src/app.tsx' },
  { level: 'log', text: 'Page reload src/app.tsx' },
  { level: 'log', text: 'Page reload src/app.tsx' },
  {
    level: 'warn',
    text: 'Each child in a list should have a unique "key" prop. Check the render method of CartItems.',
  },
  {
    level: 'warn',
    text: 'Each child in a list should have a unique "key" prop. Check the render method of CartItems.',
  },
  { level: 'debug', text: 'Rebuilt 3 modules in 18 ms' },
  { level: 'log', text: 'Hot update src/cart.tsx' },
  {
    level: 'error',
    text: 'Failed to resolve import "./totals" from "src/cart.tsx". Does the file exist?',
  },
  { level: 'log', text: 'Hot update src/cart.tsx' },
]

export function Example() {
  const log = useRef<HelixLog>(null)
  const [level, setLevel] = useState<HelixLog['level']>('log')

  useEffect(() => {
    if (log.current) {
      log.current.lines = LINES
    }
  }, [])

  const choose = (event: Event & { currentTarget: HelixSelect }) => {
    setLevel(event.currentTarget.value as HelixLog['level'])
  }

  return (
    <helix-log
      collapse
      label="Dev server"
      level={level}
      line-numbers
      ref={log}
      wrap
    >
      <helix-flex
        align-items="center"
        justify-content="between"
        slot="toolbar"
      >
        <helix-text scale="body-strong">Dev server</helix-text>
        <helix-select
          aria-label="Levels shown"
          default-value="log"
          emphasis="ghost"
          onChange={choose}
        >
          <helix-option value="debug">All levels</helix-option>
          <helix-option value="log">Logs and above</helix-option>
          <helix-option value="info">Info and above</helix-option>
          <helix-option value="warn">Warnings and errors</helix-option>
          <helix-option value="error">Errors</helix-option>
        </helix-select>
      </helix-flex>
    </helix-log>
  )
}
