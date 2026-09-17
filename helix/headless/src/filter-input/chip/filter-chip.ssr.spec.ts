import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * A chip, served, and the three segments it decides between.
 *
 * **A chip is filters a reader has already applied**, so what a server sends is
 * what narrows the page before any script runs: a row served without them
 * announces a result set nobody can see the reason for. So the segments are the
 * claim, and they are asserted whole, because which of the three is drawn is
 * this element's entire design and a fourth appearing in an empty render should
 * fail here rather than go unmentioned.
 *
 * **The values segment is served whether or not there are any**, which is the
 * one place the server and the client legitimately differ. Drawing it needs the
 * children and a server has none to read, so the choice is between an empty box
 * for a moment and the reader's own filter being invisible until hydration; the
 * component takes the first and says so at the branch.
 */
describe('filter chip server output', () => {
  test('the common chip is a field and its values, with no word between them', () => {
    /* The whole design in one render: a filter set to the field's usual
       comparison carries no `operator-label`, so no operator segment is drawn
       and the chip reads as the field and the values. */
    const markup = ssr(
      html`<helix-headless-filter-chip name="disposition" label="Disposition">
        refunded
      </helix-headless-filter-chip>`,
    )
    expect(servedParts(markup)).toEqual(['field', 'values'])
  })

  test('and a comparison somebody chose is drawn, because it is worth drawing', () => {
    const markup = ssr(
      html`<helix-headless-filter-chip
        name="disposition"
        label="Disposition"
        operator="not"
        operator-label="is not"
      >
        refunded
      </helix-headless-filter-chip>`,
    )
    expect(servedParts(markup)).toEqual(['field', 'operator', 'values'])
  })

  test('the dismiss control ships with the chip, so a filter can be taken off at once', () => {
    /* `dismissible` is what `FilterInput` gives every chip in its row, and the
       control is a real `<button>` in the served markup: a chip whose only way
       out arrived with the script is a filter a reader cannot remove on a slow
       connection. The label is the chip's own override rather than the mixin's
       "Dismiss", which is what a screen reader reads out. */
    const markup = ssr(
      html`<helix-headless-filter-chip
        dismissible
        name="disposition"
        label="Disposition"
      >
        refunded
      </helix-headless-filter-chip>`,
    )
    expect(partTag(markup, 'dismiss')).toMatch(/^<button\b/)
    expect(partTag(markup, 'dismiss')).toContain('aria-label="Remove filter"')
    expect(servedParts(markup)).toEqual(['dismiss', 'dismiss-mark', 'field', 'values'])
  })

  test('the name and the comparison stay on the host, which is where a consumer selects on them', () => {
    /* The two reflected properties here are the exception the general rule
       leaves room for: both are undefaulted, so what the server writes is
       exactly what the consumer wrote, and a consumer removing one filter from
       a row of them selects on `name`. What must not appear is anything else. */
    expect(
      hostAttributes(
        ssr(
          html`<helix-headless-filter-chip
            name="disposition"
            operator="not"
            label="Disposition"
          ></helix-headless-filter-chip>`,
        ),
        'helix-headless-filter-chip',
      ),
    ).toEqual(['label', 'name', 'operator'])
  })
})
