import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A press on a checked Switch keeps a fill the thumb reads on.
 *
 * Read from the sheet, because a spec cannot hold `:active` without a real pointer.
 * The press wash alone replaced the fill: measured November 1, 2026, the thumb fell
 * from 17.76:1 to 1.45:1 in light, and with the fill's own step it is 10.37:1.
 */
describe('a checked Switch under a press', () => {
  test('takes the fill step', () => {
    const sheet = readFileSync(join(import.meta.dir, 'switch-root.css'), 'utf8')
    const rule =
      /:host\(:state\(checked\):not\(:disabled\)\) \[part="field"\]:active \[part="track"\] \{([^}]*)\}/.exec(
        sheet,
      )
    expect(rule?.[1]).toContain('--helix-color-primary-surface-active')
  })
})
