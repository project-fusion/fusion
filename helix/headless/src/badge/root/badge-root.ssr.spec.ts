import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('badge server output', () => {
  test('the capped count is decided on the server', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-badge max="9" value="42">x</helix-headless-badge>`),
    )
    expect(markup).toContain('9+')
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(html`<helix-headless-badge label="new">x</helix-headless-badge>`)
    expect(hostAttributes(markup, 'helix-headless-badge')).toEqual(['label'])
  })

  test('the dot is empty in the server markup, so `:empty` holds before upgrade', () => {
    // A whitespace text node inside the indicator would defeat the selector,
    // and the server is where that would first show.
    const markup = withoutStyles(
      ssr(html`<helix-headless-badge label="new">x</helix-headless-badge>`),
    )
    expect(markup).toMatch(/<span[^>]*part="indicator"[^>]*>(<!--[^>]*-->)*<\/span/)
  })

  test('a value that counts nothing ships blank, so there is nothing to transition on load', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-badge value="0">x</helix-headless-badge>`),
    )
    expect(markup).toContain('data-blank')
    expect(hostAttributes(markup, 'helix-headless-badge')).toEqual(['value'])
  })
})
