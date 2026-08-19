import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, ssr } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const markup = ssr(html`<helix-input-time
  hint="Any quarter hour"
  label="Starts"
  locale="en-GB"
  name="starts"
  value="09:15"
></helix-input-time>`)

describe('input time server output', () => {
  test('the field and its input ship, before any script runs', () => {
    expect(hasPart(markup, 'field')).toBe(true)
    expect(hasPart(markup, 'control')).toBe(true)
    expect(hasPart(markup, 'trigger')).toBe(true)
  })

  test('the time is already written in the field, so nothing jumps on hydration', () => {
    // `Intl` runs on the server, so the rendering is server work rather than a
    // correction made a frame after the page arrives.
    expect(partTag(markup, 'control')).toContain('name="starts"')
    expect(markup).toContain('09:15')
  })

  test('the list is served closed, and says so', () => {
    expect(partTag(markup, 'surface')).toContain('hidden')
    expect(partTag(markup, 'trigger')).toContain('aria-expanded="false"')
  })

  test('the picker ships inside it, rather than being built on hydration', () => {
    expect(partTag(markup, 'picker')).toContain('helix-time-picker')
  })
})
