import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, rendered, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('filter input server output', () => {
  /**
   * The chip and the menu read their children while rendering, and the shim has
   * none to read: measured, `querySelector` and a spread of `childNodes` threw,
   * and took the page they were on down with them.
   */
  test('a menu of fields and a chip with an operator render on a server', () => {
    const markup = ssr(html`<helix-headless-filter-input label="Filter rows">
      <helix-headless-filter-menu slot="start">
        <helix-headless-filter-field field="status" label="Status"></helix-headless-filter-field>
      </helix-headless-filter-menu>
      <helix-headless-filter-chip label="Status" slot="tags">
        <span slot="operator">is</span>
        Open
      </helix-headless-filter-chip>
    </helix-headless-filter-input>`)
    /* `toContain('Open')` read the chip's own light-DOM text back out of the
       render, which is in the document whether or not any of these elements
       rendered at all. The frame is the claim, because the claim is that none
       of them threw: `menu` and `surface` come from the menu, `values` from the
       chip, the rest from the input, so an element that died fails here. */
    expect(servedParts(markup)).toEqual([
      'control',
      'field',
      'label',
      'lead',
      'live',
      'menu',
      'surface',
      'tags',
      'values',
    ])
  })

  test('the field is usable before any script loads', () => {
    const markup = ssr(
      html`<helix-headless-filter-input
        label="Filter rows"
        placeholder="Add a filter"
      ></helix-headless-filter-input>`,
    )
    expect(hasPart(markup, 'field')).toBe(true)
    expect(partTag(markup, 'control')).toContain('placeholder="Add a filter"')
    /* `toContain('Filter rows')` passed on the host's own `label="Filter rows"`,
       a few characters away in the opening tag, so it held whatever the input
       drew. The host tag is what `rendered` takes off, which leaves the
       `<label>` as the only place the words can be. */
    expect(rendered(markup, 'helix-headless-filter-input')).toMatch(
      /<slot name="label">(<!--[^>]*-->)*Filter rows/,
    )
  })

  test('the row is served whether or not anything is in it', () => {
    /* A slot that is not in the served markup assigns nothing, so the tokens a
       consumer wrote would be invisible until hydration. */
    const markup = ssr(
      html`<helix-headless-filter-input label="Filter rows"></helix-headless-filter-input>`,
    )
    expect(hasPart(markup, 'tags')).toBe(true)
    expect(rendered(markup, 'helix-headless-filter-input')).toContain('name="tags"')
  })

  test('the count waits for a client, having nothing to count without one', () => {
    // Slot assignment is the browser's, so the server cannot know what overflowed.
    const markup = ssr(
      html`<helix-headless-filter-input
        label="Filter rows"
        max-tags="1"
      ></helix-headless-filter-input>`,
    )
    expect(hasPart(markup, 'rest')).toBe(false)
  })

  test('the clear button waits for a value, so an empty field ships none', () => {
    const markup = ssr(
      html`<helix-headless-filter-input
        clearable
        label="Filter rows"
      ></helix-headless-filter-input>`,
    )
    expect(hasPart(markup, 'clear')).toBe(false)
  })

  test('the clear control is named, its only content being a glyph', () => {
    /* A word the component does not default to, since `clearLabel` holds
       "Clear": read against that, the assertion passes against a template
       writing the literal and says nothing about the property. */
    const markup = ssr(
      html`<helix-headless-filter-input
        clearable
        clear-label="Empty it"
        default-value="ship"
        label="Filter rows"
      ></helix-headless-filter-input>`,
    )
    expect(partTag(markup, 'clear')).toContain('aria-label="Empty it"')
  })

  test('`default-value` is the text the served field already holds', () => {
    /* The uncontrolled half of `value`, seeded in `willUpdate`, which SSR
       calls: anything later would serve an empty field and fill it at
       hydration, which for a filter is a table that comes up unnarrowed and
       then narrows under the reader. */
    const markup = ssr(
      html`<helix-headless-filter-input
        default-value="ship"
        label="Filter rows"
      ></helix-headless-filter-input>`,
    )
    expect(partTag(markup, 'control')).toContain('value="ship"')
  })

  test('`required` is on the served control, and `feedback` is the served message', () => {
    /* Both come from `MixinField` and both have to be in the parsed markup: a
       field served without `required` looks optional for as long as the script
       takes to arrive, and a message a consumer has already decided on is not a
       verdict the client has to compute. */
    const markup = ssr(
      html`<helix-headless-filter-input
        feedback="Pick at least one"
        label="Filter rows"
        required
      ></helix-headless-filter-input>`,
    )
    expect(partTag(markup, 'control')).toContain('required')
    expect(hasPart(markup, 'feedback')).toBe(true)
    expect(rendered(markup, 'helix-headless-filter-input')).toContain('Pick at least one')
  })

  test('`default-open` serves the suggestions panel showing', () => {
    /* The panel is always rendered and hidden rather than absent, so the seed
       decides which of the two a reader is served: resolved on the first client
       update instead, it appears after the first paint.

       The field's own `aria-expanded` is not asserted beside it and cannot be.
       It is written only while the element is `suggesting`, which is private
       state derived from the slotted options, and a server has no children to
       derive it from. */
    const open = ssr(
      html`<helix-headless-filter-input
        default-open
        label="Filter rows"
      ></helix-headless-filter-input>`,
    )
    expect(partTag(open, 'surface')).not.toMatch(/\shidden[\s=>]/)

    const shut = ssr(
      html`<helix-headless-filter-input label="Filter rows"></helix-headless-filter-input>`,
    )
    expect(partTag(shut, 'surface')).toMatch(/\shidden[\s=>]/)
  })
})
