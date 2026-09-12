import { describe, expect, test } from 'bun:test'
import { partTag, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * A skip link, served.
 *
 * The server's markup is the whole of it until the script arrives, and before
 * then the anchor has to work as a plain link: a keyboard reader pressing it
 * on a slow connection is the reader it exists for.
 */
describe('skip link server output', () => {
  test('is a real anchor with a real href before any script runs', () => {
    const markup = ssr(html`<helix-headless-skip-link href="#content"></helix-headless-skip-link>`)
    expect(partTag(markup, 'link')).toMatch(/^<a\b/)
    expect(partTag(markup, 'link')).toContain('href="#content"')
  })

  test('carries its words in the markup', () => {
    const markup = ssr(html`<helix-headless-skip-link></helix-headless-skip-link>`)
    expect(withoutStyles(markup)).toContain('Skip to content')
  })
})
