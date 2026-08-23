import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('badge server output', () => {
  test('the capped count is decided on the server', () => {
    const markup = withoutStyles(
      ssr(html`<helix-base-badge max="9" value="42">x</helix-base-badge>`),
    )
    expect(markup).toContain('9+')
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(html`<helix-base-badge label="new">x</helix-base-badge>`)
    expect(hostAttributes(markup, 'helix-base-badge')).toEqual(['label'])
  })

  test('the dot is empty in the server markup, so `:empty` holds before upgrade', () => {
    // A whitespace text node inside the indicator would defeat the selector,
    // and the server is where that would first show.
    const markup = withoutStyles(ssr(html`<helix-base-badge label="new">x</helix-base-badge>`))
    expect(markup).toMatch(/<span[^>]*part="indicator"[^>]*>(<!--[^>]*-->)*<\/span/)
  })

  test('a value that counts nothing ships blank, so there is nothing to transition on load', () => {
    const markup = withoutStyles(ssr(html`<helix-base-badge value="0">x</helix-base-badge>`))
    expect(markup).toContain('data-blank')
    expect(hostAttributes(markup, 'helix-base-badge')).toEqual(['value'])
  })
})
