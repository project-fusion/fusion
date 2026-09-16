import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const bar = html`<helix-headless-navigation label="Sections">
  <a aria-current="page" data-navigation-item href="/design">Design</a>
  <a data-navigation-item href="/mind">Mind</a>
</helix-headless-navigation>`

describe('nav bar server output', () => {
  test('the landmark and its name are served', () => {
    // A page can hold more than one navigation, and landmarks are how a
    // screen-reader user chooses between them.
    expect(partTag(ssr(bar), 'nav')).toContain('aria-label="Sections"')
  })

  test('the destinations are projected, so a router keeps its own anchors', () => {
    /* They are slotted, so a crawler and a router both see real anchors.
       `toContain('href="/design"')` could not say that: the anchor is the
       fixture's own light-DOM child and is in the served markup whatever this
       component does. What it owes is a bare slot inside the landmark, and no
       anchor of its own, read off a render with no children. */
    const empty = rendered(
      ssr(html`<helix-headless-navigation label="Sections"></helix-headless-navigation>`),
      'helix-headless-navigation',
    )
    expect(empty).toMatch(/<slot\s*><\/slot>/)
    expect(empty).not.toContain('<a')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(bar), 'helix-headless-navigation')).toEqual(['label'])
  })
})
