import { describe, expect, test } from 'bun:test'
import { hasPart, ssr } from '@helix-io/testing/ssr'
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
    expect(hasPart(ssr(html`<helix-base-tree label="Files"></helix-base-tree>`), 'empty')).toBe(
      false,
    )
    expect(
      hasPart(ssr(html`<helix-base-table label="Invoices"></helix-base-table>`), 'empty'),
    ).toBe(false)
    expect(hasPart(ssr(html`<helix-base-menu label="Actions"></helix-base-menu>`), 'empty')).toBe(
      false,
    )
    expect(
      hasPart(ssr(html`<helix-base-drilldown label="Pages"></helix-base-drilldown>`), 'empty'),
    ).toBe(false)
  })

  test('but loading does ship, because the consumer declared it', () => {
    /* The difference is who knows. Emptiness is discovered and loading is
       stated, so one can cross the wire and the other cannot. A reader on a
       slow connection sees "Loading" in the first paint rather than a blank
       box that fills in when a script arrives. */
    expect(
      hasPart(ssr(html`<helix-base-tree label="Files" loading></helix-base-tree>`), 'loading'),
    ).toBe(true)
    expect(
      hasPart(ssr(html`<helix-base-table label="Invoices" loading></helix-base-table>`), 'loading'),
    ).toBe(true)
  })
})
