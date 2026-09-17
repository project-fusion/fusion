import { describe, expect, test } from 'bun:test'
import { hostAttributes, rendered, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'
import '../../option/index.js'

/**
 * The picker, served, and this is the document-resolved case in another form.
 *
 * **What it draws is read off its children, and a server has none.** `fields`
 * answers `knownChildren`, which is empty on a server and while hydrating what
 * one sent, so the rows cannot exist yet for the same reason a chart's marks
 * cannot: the thing they are drawn from is the tree. What the menu owes instead
 * is the frame, the trigger and the panel that will hold them, so the control a
 * reader presses is there before any script and the panel it opens into is
 * reserved rather than built on the first press.
 *
 * **Asserted whole rather than as an absence somebody thought of.** A row added
 * to the empty render would pass every `not.toContain` a spec author remembered
 * to write, and that is the shape this family's own root spec was rewritten
 * against.
 */
describe('filter menu server output', () => {
  test('the frame is served and nothing is drawn in it', () => {
    const markup = ssr(
      html`<helix-headless-filter-menu label="Filter">
        <helix-headless-filter-field name="disposition" label="Disposition">
          <helix-headless-filter-operator
            name="any"
            label="is any of"
            default
          ></helix-headless-filter-operator>
          <helix-headless-option value="refunded">Refunded</helix-headless-option>
        </helix-headless-filter-field>
      </helix-headless-filter-menu>`,
    )
    /* `menu` and `surface` are this element's frame, forwarded off the menu it
       composes. `item`, `label` and `text` are the option's own row, which is
       the consumer's markup rendering itself and is asserted where it lives.
       What is absent is every `entry`: no field row, no comparison, no value,
       and no divider between the two runs. */
    expect(servedParts(markup)).toEqual(['item', 'label', 'menu', 'surface', 'text'])
  })

  test('the trigger is served, so the control a reader presses exists before any script', () => {
    /* A slot that is not in the served markup assigns nothing, so a consumer's
       own button would be invisible until hydration: the one control on the
       page whose whole job is to be pressed. */
    const markup = ssr(
      html`<helix-headless-filter-menu label="Filter">
        <button slot="trigger">Filter</button>
      </helix-headless-filter-menu>`,
    )
    expect(rendered(markup, 'helix-headless-filter-menu')).toContain('name="trigger"')
  })

  test('the menu carries the name this element was given', () => {
    // Read off the menu's own opening tag rather than off the document, where
    // the host's `label="Filter"` sits a few characters away and would have
    // satisfied the assertion whatever the menu was called.
    const markup = ssr(
      html`<helix-headless-filter-menu label="Narrow the queue"></helix-headless-filter-menu>`,
    )
    expect(rendered(markup, 'helix-headless-filter-menu')).toContain('label="Narrow the queue"')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-headless-filter-menu label="Filter"></helix-headless-filter-menu>`),
        'helix-headless-filter-menu',
      ),
    ).toEqual(['label'])
  })
})
