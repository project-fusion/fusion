import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/* **`selected` on the tab and the panel, and nothing on the root.**
 *
 * The root cannot choose a tab on a server: `children` is undefined there, so
 * there is nothing to pair and nothing to count. A consumer whose first paint
 * is right says which tab it is where the server can see it, which is on the
 * tab and on the panel. `default-active` reaches neither, and that is the limit
 * this family's headless server spec records in full. */
const markup = ssr(html`<helix-tabs label="Sections">
  <helix-tab selected value="one">One</helix-tab>
  <helix-tab value="two">Two</helix-tab>
  <helix-tab-panel selected slot="panels" value="one">First</helix-tab-panel>
</helix-tabs>`)

describe('tabs server output', () => {
  test('the tab list is announced before any JavaScript runs', () => {
    expect(partTag(markup, 'tabs')).toContain('role="tablist"')
    expect(partTag(markup, 'tab')).toContain('role="tab"')
  })

  test('the tab the markup declares chosen is served chosen', () => {
    expect(partTag(markup, 'tab')).toContain('aria-selected="true"')
  })

  /**
   * **A strip nothing has answered for is still reachable.**
   *
   * The stop rides on `selected`, which is the root's word, and the root says it
   * by reading its children. A server has none, so `-1` on every tab was a claim
   * about a stop that does not exist yet and it left the strip impossible to
   * enter with a keyboard.
   */
  test('a tab nothing has answered for is in the tab order rather than out of it', () => {
    expect(partTag(ssr(html`<helix-tab>One</helix-tab>`), 'tab')).toContain('tabindex="0"')
  })

  test('the panel ships its content, so a crawler reads it whichever tab is open', () => {
    const panel = ssr(html`<helix-tab-panel value="two"></helix-tab-panel>`)
    expect(partTag(panel, 'panel')).toContain('role="tabpanel"')
    expect(rendered(panel, 'helix-tab-panel')).toContain('<slot></slot>')
  })

  test('the hosts carry only what the consumer wrote', () => {
    expect(hostAttributes(markup, 'helix-tabs')).toEqual(['label'])
    expect(hostAttributes(markup, 'helix-tab')).toEqual(['selected', 'value'])
  })
})
