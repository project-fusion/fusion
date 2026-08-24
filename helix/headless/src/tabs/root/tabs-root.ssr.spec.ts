import { describe, expect, test } from 'bun:test'
import { partTag, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

/* `default-active`, not `value`. The fixture set `value="one"`, which is not an
   attribute this component has: the line was inert, so every assertion below it
   was made against a set with nothing current at all and still passed. */
const markup = ssr(html`<helix-headless-tabs default-active="one">
  <helix-headless-tabs-tab selected value="one">One</helix-headless-tabs-tab>
  <helix-headless-tabs-panel selected slot="panels" value="one">First</helix-headless-tabs-panel>
  <helix-headless-tabs-panel slot="panels" value="two">Second</helix-headless-tabs-panel>
</helix-headless-tabs>`)

describe('tabs server output', () => {
  test('the tab list is announced before any JavaScript runs', () => {
    expect(partTag(markup, 'tabs')).toContain('role="tablist"')
    expect(partTag(markup, 'tab')).toContain('role="tab"')
  })

  test('the server ships no IDREF, because none of them could ever resolve', () => {
    /* These were `aria-controls="panel-one"` and `aria-labelledby="tab-one"`,
       derived from `value` so the server and the client would agree without
       generating anything. They agreed, and both pointed at nothing: each id
       was rendered inside the *other* element's shadow root, and an IDREF
       resolves only in the tree it is written in.

       The panel's name is a string handed down by the root, which has to read
       the tab's light DOM to know it, so it is a client-side enhancement by the
       same rule everything that inspects the tree is. What the server must not
       do is ship a reference that resolves to nothing, which is what this now
       asserts. */
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
