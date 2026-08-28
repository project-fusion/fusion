import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
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
     
       Asked of the host's attributes rather than of the whole document: the
       stylesheet ships inside the output and names `data-more` in its own
       selectors, so a substring check found it every time and passed on nothing. */
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
})
