import { describe, expect, test } from 'bun:test'
import { hostAttributes, rendered, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('badge server output', () => {
  test('the capped count is decided on the server', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-badge max="9" value="42">x</helix-headless-badge>`),
    )
    expect(rendered(markup, 'helix-headless-badge')).toContain('9+')
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(html`<helix-headless-badge label="new">x</helix-headless-badge>`)
    expect(hostAttributes(markup, 'helix-headless-badge')).toEqual(['label'])
  })

  /* The dot is read off the value, which the server has, and the icon's slot
     is served in the mark, so a served mark is the hydrated one whether or not
     an icon is slotted. */
  test('the dot is marked in the server markup, with the icon slot and no text', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-badge label="new">x</helix-headless-badge>`),
    )
    expect(rendered(markup, 'helix-headless-badge')).toMatch(
      /<span(?=[^>]*data-dot)[^>]*part="indicator"[^>]*>(<!--[^>]*-->)*<slot[^>]*name="icon"[^>]*><\/slot>(<!--[^>]*-->)*<\/span/,
    )
  })

  test('a value that counts nothing ships blank, so there is nothing to transition on load', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-badge value="0">x</helix-headless-badge>`),
    )
    expect(rendered(markup, 'helix-headless-badge')).toContain('data-blank')
    expect(hostAttributes(markup, 'helix-headless-badge')).toEqual(['value'])
  })
})
