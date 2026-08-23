import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('page nav server output', () => {
  test('is a navigation landmark with a name', () => {
    const markup = ssr(html`<helix-base-outline label="On this page"></helix-base-outline>`)
    expect(hasPart(markup, 'nav')).toBe(true)
    expect(partTag(markup, 'nav')).toContain('aria-label="On this page"')
  })

  test('the links are served, because they are the consumer’s own anchors', () => {
    const markup = withoutStyles(
      ssr(html`<helix-base-outline><a href="#install">Install</a></helix-base-outline>`),
    )
    expect(markup).toContain('Install')
  })

  test('nothing is marked current, because scroll position is not a server’s to know', () => {
    /* The one thing this component decides is derived from where the page is
       scrolled to. A server rendering a guess would be rendering something the
       client immediately contradicts. */
    const markup = withoutStyles(
      ssr(html`<helix-base-outline><a href="#install">Install</a></helix-base-outline>`),
    )
    expect(markup).not.toContain('aria-current')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-base-outline label="On this page" offset="64"></helix-base-outline>`),
        'helix-base-outline',
      ),
    ).toEqual(['label', 'offset'])
  })
})
