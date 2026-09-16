import { describe, expect, test } from 'bun:test'
import { hostAttributes, rendered, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('text server output', () => {
  test('the tag is decided on the server', () => {
    // `as` picks the element, so a heading is a heading in the served HTML
    // rather than a span that becomes one after hydration.
    const markup = withoutStyles(ssr(html`<helix-text as="h2">Title</helix-text>`))
    expect(rendered(markup, 'helix-text')).toMatch(/<h2[^>]*part="text"/)
  })

  test('a span is the default element', () => {
    const markup = withoutStyles(ssr(html`<helix-text>Body</helix-text>`))
    expect(rendered(markup, 'helix-text')).toMatch(/<span[^>]*part="text"/)
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(html`<helix-text>x</helix-text>`), 'helix-text')).toEqual([])
  })
})
