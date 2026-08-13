import { describe, expect, test } from 'bun:test'
import { partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const markup = ssr(html`<helix-tabs value="one">
  <helix-tabs-tab selected value="one">One</helix-tabs-tab>
  <helix-tabs-panel selected slot="panels" value="one">First</helix-tabs-panel>
  <helix-tabs-panel slot="panels" value="two">Second</helix-tabs-panel>
</helix-tabs>`)

describe('tabs server output', () => {
  test('the tab list is announced before any JavaScript runs', () => {
    expect(partTag(markup, 'tabs')).toContain('role="tablist"')
    expect(partTag(markup, 'tab')).toContain('role="tab"')
  })

  test('a tab and its panel are already paired in the markup', () => {
    // The ids come from `value`, so the server and the client agree without
    // either of them generating anything.
    expect(partTag(markup, 'tab')).toContain('aria-controls="panel-one"')
    expect(partTag(markup, 'panel')).toContain('aria-labelledby="tab-one"')
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
