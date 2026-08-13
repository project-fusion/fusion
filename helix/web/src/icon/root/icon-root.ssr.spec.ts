import { describe, expect, test } from 'bun:test'
import { html } from 'lit'
import { ssr } from '../../testing/ssr.js'
import '../index.js'

describe('icon server output', () => {
  test('the glyph is in the served markup, not drawn after hydration', () => {
    const markup = ssr(html`<helix-icon name="check"></helix-icon>`)
    expect(markup).toContain('<svg')
    expect(markup).toContain('M20 6L9 17l-5-5')
  })

  test('an unknown name ships nothing at all', () => {
    const markup = ssr(html`<helix-icon name="not-a-real-icon"></helix-icon>`)
    expect(markup).not.toContain('<svg')
  })

  test('decoration is hidden from the start', () => {
    // If `aria-hidden` were applied on the client, a screen reader could reach
    // the icon during the window before hydration.
    const markup = ssr(html`<helix-icon name="close"></helix-icon>`)
    expect(markup).toContain('aria-hidden="true"')
  })

  test('a label ships with the icon', () => {
    const markup = ssr(html`<helix-icon name="close" label="Dismiss"></helix-icon>`)
    expect(markup).toContain('role="img"')
    expect(markup).toContain('aria-label="Dismiss"')
  })
})
