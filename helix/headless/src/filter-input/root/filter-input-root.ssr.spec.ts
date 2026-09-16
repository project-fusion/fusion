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
      <helix-headless-filter-chip label="Status" slot="tokens">
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
})
