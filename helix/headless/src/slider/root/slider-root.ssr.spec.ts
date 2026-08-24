import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, ssr } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('slider server output', () => {
  test('the range ships with its bounds, not just its value', () => {
    // A range whose min and max arrive on hydration jumps: the browser clamps
    // the value against the defaults of 0 and 100 first.
    const control = partTag(
      ssr(html`<helix-headless-slider max="200" min="50" value="120"></helix-headless-slider>`),
      'control',
    )
    expect(control).toMatch(/<input/)
    expect(control).toContain('50')
    expect(control).toContain('200')
  })

  test('markers are rendered on the server, since they are layout', () => {
    expect(
      hasPart(ssr(html`<helix-headless-slider markers="5"></helix-headless-slider>`), 'markers'),
    ).toBe(true)
  })

  test('one marker is none, so the row is not drawn for it', () => {
    expect(
      hasPart(ssr(html`<helix-headless-slider markers="1"></helix-headless-slider>`), 'markers'),
    ).toBe(false)
  })
})
