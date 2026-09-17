import { describe, expect, test } from 'bun:test'
import { hostAttributes, rendered, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'
import '../../option/index.js'

/**
 * A field, served, and what it owes a server is nothing it draws.
 *
 * Like the comparisons under it, this element renders no slot, so the schema a
 * consumer wrote in markup is held and never painted. What a server spec can
 * still fail on is the reading: `operators` and `values` both go through
 * `querySelectorAll`, and the shim carries attributes but not tree traversal,
 * so a getter a template reached would take the page down before a character of
 * markup came out. They are not reached from `render`, and this is what holds
 * that true.
 */
describe('filter field server output', () => {
  test('renders nothing, so a schema in markup stays off the page', () => {
    const markup = ssr(
      html`<helix-headless-filter-field name="disposition" label="Disposition">
        <helix-headless-filter-operator
          name="any"
          label="is any of"
          default
        ></helix-headless-filter-operator>
        <helix-headless-option value="refunded">Refunded</helix-headless-option>
      </helix-headless-filter-field>`,
    )
    /* The option inside draws its own row, which is that element's business and
       is asserted where it lives. This field contributes nothing to the list,
       so the claim is that `item` and `label` are all of it: a part this
       element started drawing would fail here rather than go unmentioned. */
    expect(servedParts(markup)).toEqual(['item', 'label', 'text'])
    expect(rendered(markup, 'helix-headless-filter-field')).not.toContain(
      '<slot></slot></helix-headless-filter-field>',
    )
  })

  test('the host carries only what the consumer wrote', () => {
    expect(
      hostAttributes(
        ssr(
          html`<helix-headless-filter-field
            name="disposition"
            label="Disposition"
          ></helix-headless-filter-field>`,
        ),
        'helix-headless-filter-field',
      ),
    ).toEqual(['label', 'name'])
  })
})
