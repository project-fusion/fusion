import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('scroll area server output', () => {
  test('ships the box, so the content is scrollable before hydration', () => {
    expect(
      hasPart(
        ssr(html`<helix-headless-scroll-area><p>One</p></helix-headless-scroll-area>`),
        'viewport',
      ),
    ).toBe(true)
  })

  test('says nothing about edges, because the server cannot measure', () => {
    /* Which edges have more past them is a reading of a laid-out box, and the
       server has none. Guessing would put a fade over content that fits.

       The edges are custom states now and a state cannot be serialized, so this
       holds by construction. It stays because the attribute is what a future
       change would reach for: `data-more` on the host is markup a framework did
       not render, and writing it on upgrade is the hydration mismatch this
       element used to report on every load.

       Asked of the host's attributes rather than of the whole document, since a
       substring check over the output found the name in the stylesheet that
       ships inside it and passed on nothing. */
    const markup = ssr(
      html`<helix-headless-scroll-area label="Notes"><p>One</p></helix-headless-scroll-area>`,
    )
    const attributes = hostAttributes(markup, 'helix-headless-scroll-area')
    expect(attributes.some((one) => one.startsWith('data-more'))).toBe(false)
  })

  test('and gives no tab stop it cannot know is needed', () => {
    const markup = partTag(
      ssr(html`<helix-headless-scroll-area><p>One</p></helix-headless-scroll-area>`),
      'viewport',
    )
    expect(markup).not.toContain('tabindex')
  })

  test('serves no scrollbars unless asked for', () => {
    expect(
      servedParts(ssr(html`<helix-headless-scroll-area><p>One</p></helix-headless-scroll-area>`)),
    ).toEqual(['edges', 'viewport'])
  })

  test('serves the scrollbars it was asked for hidden, because the server cannot measure', () => {
    /* Whether an axis has anything past it is a reading of a laid-out box. A
       scrollbar served showing would be drawn over content that fits. */
    const markup = ssr(
      html`<helix-headless-scroll-area scrollbars="auto"><p>One</p></helix-headless-scroll-area>`,
    )
    for (const name of ['scrollbar-vertical', 'scrollbar-horizontal', 'corner']) {
      expect(partTag(markup, name)).toMatch(/\shidden/)
      expect(partTag(markup, name)).not.toContain('scrollbar-visible')
      expect(partTag(markup, name)).not.toContain('--scroll-area')
    }
    expect(hostAttributes(markup, 'helix-headless-scroll-area')).toEqual(['scrollbars'])
  })

  test('serves the axis orientation clips, so the content does not scroll sideways before it upgrades', () => {
    const markup = ssr(
      html`<helix-headless-scroll-area orientation="vertical"><p>One</p></helix-headless-scroll-area>`,
    )
    expect(partTag(markup, 'viewport')).toContain('overflow-x: hidden')
    expect(
      partTag(
        ssr(html`<helix-headless-scroll-area><p>One</p></helix-headless-scroll-area>`),
        'viewport',
      ),
    ).not.toContain('style=')
  })
})
