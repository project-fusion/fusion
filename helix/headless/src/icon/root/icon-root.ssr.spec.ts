import { describe, expect, test } from 'bun:test'
import { ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('icon server output', () => {
  test('the glyph is in the served markup, not drawn after hydration', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-icon name="check"></helix-headless-icon>`),
    )
    expect(markup).toContain('<svg')
    expect(markup).toContain('currentColor')
  })

  test('an unknown name ships nothing at all', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-icon name="not-a-real-icon"></helix-headless-icon>`),
    )
    expect(markup).not.toContain('<svg')
  })

  test('decoration is hidden from the start', () => {
    // If `aria-hidden` were applied on the client, a screen reader could reach
    // the icon during the window before hydration.
    const markup = withoutStyles(ssr(html`<helix-headless-icon name="x"></helix-headless-icon>`))
    expect(markup).toContain('aria-hidden="true"')
  })

  test('a label ships with the icon', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-icon name="x" label="Dismiss"></helix-headless-icon>`),
    )
    expect(markup).toContain('role="img"')
    expect(markup).toContain('aria-label="Dismiss"')
  })
})
