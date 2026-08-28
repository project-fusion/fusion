import { describe, expect, test } from 'bun:test'
import { hasPart, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'
import '../../tree/index.js'
import '../../menu/index.js'
import '../../drilldown/index.js'

describe('a collection on the server', () => {
  test('never claims to be empty, because it cannot know', () => {
    /* Emptiness is a fact about light DOM children and the server has none to
       count: `slotchange` does not fire there and `updated` does not run.
       Shipping "Nothing to show" over markup that is about to have rows in it
       is the one thing an empty state must never do, and it would be shipped
       into the first paint where a reader would see it. */
    expect(
      hasPart(ssr(html`<helix-headless-tree label="Files"></helix-headless-tree>`), 'empty'),
    ).toBe(false)
    expect(
      hasPart(ssr(html`<helix-headless-table label="Invoices"></helix-headless-table>`), 'empty'),
    ).toBe(false)
    expect(
      hasPart(ssr(html`<helix-headless-menu label="Actions"></helix-headless-menu>`), 'empty'),
    ).toBe(false)
    expect(
      hasPart(
        ssr(html`<helix-headless-drilldown label="Pages"></helix-headless-drilldown>`),
        'empty',
      ),
    ).toBe(false)
  })

  test('but loading does ship, because the consumer declared it', () => {
    /* The difference is who knows. Emptiness is discovered and loading is
       stated, so one can cross the wire and the other cannot. A reader on a
       slow connection sees "Loading" in the first paint rather than a blank
       box that fills in when a script arrives. */
    expect(
      hasPart(
        ssr(html`<helix-headless-tree label="Files" loading></helix-headless-tree>`),
        'loading',
      ),
    ).toBe(true)
    expect(
      hasPart(
        ssr(html`<helix-headless-table label="Invoices" loading></helix-headless-table>`),
        'loading',
      ),
    ).toBe(true)
  })
})
