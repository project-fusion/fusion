import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  partTag,
  rendered,
  ssr,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('page nav server output', () => {
  test('is a navigation landmark with a name', () => {
    const markup = ssr(html`<helix-headless-outline label="On this page"></helix-headless-outline>`)
    expect(hasPart(markup, 'nav')).toBe(true)
    expect(partTag(markup, 'nav')).toContain('aria-label="On this page"')
  })

  test('the anchors are projected into the landmark, not collected beside it', () => {
    /* The links are the consumer's own, echoed by declarative shadow DOM
       whatever this renders, so `toContain('Install')` held for an outline that
       projected nothing. The claim is the slot inside the `<nav>`: that is what
       puts the anchors in the landmark rather than next to it. Read off a
       render with no children, so the only shadow root here is the outline's
       own. */
    const markup = ssr(html`<helix-headless-outline></helix-headless-outline>`)
    expect(rendered(markup, 'helix-headless-outline')).toMatch(
      /<nav[^>]*part="nav"[^>]*>\s*(?:<!--[^>]*-->)?<slot\s*><\/slot>/,
    )
  })

  test('nothing is marked current, because scroll position is not a server’s to know', () => {
    /* The one thing this component decides is derived from where the page is
       scrolled to. A server rendering a guess would be rendering something the
       client immediately contradicts. */
    const markup = withoutStyles(
      ssr(html`<helix-headless-outline><a href="#install">Install</a></helix-headless-outline>`),
    )
    expect(markup).not.toContain('aria-current')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(
      hostAttributes(
        ssr(
          html`<helix-headless-outline label="On this page" offset="64"></helix-headless-outline>`,
        ),
        'helix-headless-outline',
      ),
    ).toEqual(['label', 'offset'])
  })

  test('serves the heading slot in its box above the landmark', () => {
    const markup = rendered(
      ssr(html`<helix-headless-outline></helix-headless-outline>`),
      'helix-headless-outline',
    )
    expect(markup).toMatch(/<div\s+part="heading"\s*>\s*(?:<!--[^>]*-->\s*)*<slot\s+name="heading"/)
    expect(markup.indexOf('part="heading"')).toBeLessThan(markup.indexOf('part="nav"'))
  })

  test('serves no lists, since a server cannot read the levels of links it cannot see', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-outline><a href="#a" data-level="2">A</a></helix-headless-outline>`),
    )
    expect(markup).not.toContain('role="list')
  })
})
