import { describe, expect, test } from 'bun:test'
import { partTag, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/* `default-active`, not `value`. This component has no `value` attribute, so a
   fixture written that way is inert and every assertion below it is made
   against a set with nothing current at all, and still passes. */
const markup = ssr(html`<helix-headless-tabs default-active="one">
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
    const structure = withoutStyles(markup)
    expect(structure).toContain('First')
    expect(structure).toContain('Second')
  })
})
