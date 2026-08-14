import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const calendar = html`<helix-calendar
  label="Choose a date"
  month="2026-08"
  value="2026-08-14"
></helix-calendar>`

describe('calendar server output', () => {
  test('the month is rendered on the server, not built on the client', () => {
    const markup = withoutStyles(ssr(calendar))
    expect(markup).toContain('August 2026')
    expect(partTag(ssr(calendar), 'grid')).toContain('role="grid"')
  })

  test('the tab stop is in the served markup, so the grid is reachable at once', () => {
    expect(withoutStyles(ssr(calendar))).toContain('tabindex="0"')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(calendar), 'helix-calendar')).toEqual(['label', 'month', 'value'])
  })
})
