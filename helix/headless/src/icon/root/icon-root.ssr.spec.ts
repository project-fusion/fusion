import { describe, expect, test } from 'bun:test'
import { hostAttributes, rendered, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('icon server output', () => {
  test('the glyph is in the served markup, not drawn after hydration', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-icon name="check"></helix-headless-icon>`),
    )
    expect(rendered(markup, 'helix-headless-icon')).toContain('<svg')
    expect(rendered(markup, 'helix-headless-icon')).toContain('currentColor')
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
    expect(rendered(markup, 'helix-headless-icon')).toContain('aria-hidden="true"')
  })

  test('a label ships with the icon', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-icon name="x" label="Dismiss"></helix-headless-icon>`),
    )
    expect(rendered(markup, 'helix-headless-icon')).toContain('role="img"')
    expect(rendered(markup, 'helix-headless-icon')).toContain('aria-label="Dismiss"')
  })
})

/**
 * A value handed over on the server, which is the half of this a page depends
 * on.
 *
 * **The glyph has to be in the markup rather than after hydration.** A property
 * is set by the template rather than written in HTML, so the question this
 * answers is whether the server can see one at all: it can, because the server
 * renders the same template the client does, and what it writes out is the SVG
 * rather than the value that produced it.
 */
describe('an icon handed over as data, on the server', () => {
  const drawn = {
    content: '<circle cx="12" cy="12" r="10" fill="currentColor"></circle>',
    name: 'acme-dot',
    viewBox: '0 0 24 24',
  }

  test('the glyph is served, and its own box with it', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-icon .icon=${drawn}></helix-headless-icon>`),
    )
    expect(rendered(markup, 'helix-headless-icon')).toContain('viewBox="0 0 24 24"')
    expect(rendered(markup, 'helix-headless-icon')).toContain('<circle')
  })

  test('nothing of the value itself reaches the page', () => {
    /* A property is not an attribute, and a server that wrote one out would be
       shipping the data twice: once as the markup a reader sees and once as a
       string nothing reads. */
    const markup = withoutStyles(
      ssr(html`<helix-headless-icon .icon=${drawn}></helix-headless-icon>`),
    )
    expect(hostAttributes(markup, 'helix-headless-icon')).toEqual([])
    expect(rendered(markup, 'helix-headless-icon')).not.toContain('acme-dot')
  })
})
