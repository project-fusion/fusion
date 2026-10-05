import { describe, expect, test } from 'bun:test'
import { partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/* **`selected` on the tab and the panel, and nothing on the root.**
 *
 * This element cannot choose a tab on the server: `children` is undefined
 * there, so there is nothing to pair and nothing to count. A consumer whose
 * first paint is right says which tab it is where the server can see it, which
 * is on the tab and on the panel, and that is what these assertions are about.
 *
 * So no `default-active` here, and not because it is wrong: with one the fixture
 * says the same thing twice and every assertion below would pass on the copy
 * the server never reads. The client half, that the markup's answer survives
 * upgrade rather than being resolved over, is in `tabs-root.dom.spec.ts`.
 *
 * `value` on the root would be worse still. This component has no such
 * attribute, so a fixture written that way is inert and every assertion below it
 * is made against a set with nothing current at all, and still passes. */
const markup = ssr(html`<helix-headless-tabs>
  <helix-headless-tab selected value="one">One</helix-headless-tab>
  <helix-headless-tab-panel selected slot="panels" value="one">First</helix-headless-tab-panel>
  <helix-headless-tab-panel slot="panels" value="two">Second</helix-headless-tab-panel>
</helix-headless-tabs>`)

describe('tabs server output', () => {
  test('the tab list is announced before any JavaScript runs', () => {
    expect(partTag(markup, 'tabs')).toContain('role="tablist"')
    expect(partTag(markup, 'tab')).toContain('role="tab"')
  })

  test('the server ships no IDREF, because none of them could ever resolve', () => {
    /* `aria-controls="panel-one"` and `aria-labelledby="tab-one"` derived from
       `value` look right, because the server and the client agree on them
       without generating anything. They agree and both point at nothing: each
       id is rendered inside the *other* element's shadow root, and an IDREF
       resolves only in the tree it is written in.

       The panel's name is a string handed down by the root, which has to read
       the tab's light DOM to know it, so it is a client-side enhancement by the
       same rule everything that inspects the tree is. What the server must not
       do is ship a reference that resolves to nothing. */
    expect(partTag(markup, 'tab')).not.toContain('aria-controls')
    expect(partTag(markup, 'panel')).not.toContain('aria-labelledby')
  })

  test('the selected state is rendered, not applied on hydration', () => {
    expect(partTag(markup, 'tab')).toContain('aria-selected="true"')
  })

  test('every panel ships its content, whichever is open', () => {
    /* `toContain('First')` and `toContain('Second')` were the fixture's own
       light-DOM panels read back out of the document, which is true of a panel
       that renders nothing at all. The claim is that the panel a reader is not
       on ships too, and the only difference between the two is `hidden`: the
       subtree is present either way, so opening a tab after hydration is an
       attribute coming off rather than content arriving. */
    const current = ssr(
      html`<helix-headless-tab-panel selected value="one"></helix-headless-tab-panel>`,
    )
    const other = ssr(html`<helix-headless-tab-panel value="two"></helix-headless-tab-panel>`)
    expect(partTag(current, 'panel')).not.toContain('hidden')
    expect(partTag(other, 'panel')).toContain('hidden')
    expect(rendered(other, 'helix-headless-tab-panel')).toMatch(/<slot\s*><\/slot>/)
  })
})
