import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const markup = ssr(html`<helix-date-input
  hint="Any weekday"
  label="Starts"
  min="2026-01-01"
  name="starts"
  value="2026-08-18"
></helix-date-input>`)

describe('input date server output', () => {
  test('the field and its input ship, before any script runs', () => {
    expect(hasPart(markup, 'field')).toBe(true)
    expect(hasPart(markup, 'control')).toBe(true)
    expect(hasPart(markup, 'trigger')).toBe(true)
  })

  test('the date is already in the field, so nothing jumps on hydration', () => {
    expect(partTag(markup, 'control')).toContain('name="starts"')
    expect(markup).toContain('2026-08-18')
  })

  test('the calendar is served closed, and says so', () => {
    // `popover` and `hidden` are on the panel, so nothing flashes open while the
    // element is still upgrading.
    expect(partTag(markup, 'surface')).toContain('hidden')
    expect(partTag(markup, 'trigger')).toContain('aria-expanded="false"')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(markup, 'helix-date-input')).toEqual([
      'hint',
      'label',
      'min',
      'name',
      'value',
    ])
  })
})
