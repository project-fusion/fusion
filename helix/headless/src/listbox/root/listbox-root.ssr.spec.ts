import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  namesControl,
  partTag,
  rendered,
  ssr,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const TAG = 'helix-headless-listbox'

describe('listbox server output', () => {
  test('the items region ships with its tab stop', () => {
    // One stop for the whole list, and it is in the served markup, so a
    // keyboard reader can reach the list before any script has run.
    const items = partTag(
      ssr(html`<helix-headless-listbox label="Owner"></helix-headless-listbox>`),
      'items',
    )
    expect(items).toMatch(/<div/)
    expect(items).toContain('tabindex="0"')
  })

  test('a disabled list ships out of the tab order', () => {
    expect(
      partTag(ssr(html`<helix-headless-listbox disabled></helix-headless-listbox>`), 'items'),
    ).toContain('tabindex="-1"')
  })

  test('the empty state does not ship, because emptiness is a fact about children', () => {
    // The server has no tree to count, and rendering "no matches" over a list
    // that does have options would be worse than not rendering it at all.
    expect(
      hasPart(ssr(html`<helix-headless-listbox label="Owner"></helix-headless-listbox>`), 'empty'),
    ).toBe(false)
  })

  test('the group label is in the served HTML', () => {
    const markup = ssr(html`<helix-headless-listbox label="Owner"></helix-headless-listbox>`)
    expect(partTag(markup, 'label')).toMatch(/<span\s/)
    expect(rendered(markup, TAG)).toContain('Owner')
  })

  test('and the served list is the listbox, named by the words beside it', () => {
    /* The name reached the host through `ElementInternals`, which no server
       writes, so the served list carried the words and no accessible name
       until it upgraded. The listbox is the list now, in the same tree as the
       label, so a plain `aria-labelledby` names it in the served markup. */
    const markup = ssr(html`<helix-headless-listbox label="Owner"></helix-headless-listbox>`)
    expect(namesControl(markup)).toBe(false)
    expect(partTag(markup, 'items')).toContain('role="listbox"')
    expect(partTag(markup, 'items')).toContain('aria-labelledby="label"')
  })

  test('the filter ships with the list, not after it', () => {
    /* A field that arrived on hydration is a list a reader started scrolling
       before finding out it could be narrowed.

       A word the component does not default to. `filterLabel` holds "Filter",
       so reading that back passes against a template writing the literal and
       says nothing about the property at all. It lands twice, as the visible
       placeholder and as the accessible name, and both are asserted because
       either could stop being wired without the other noticing. */
    const markup = ssr(
      html`<helix-headless-listbox
        filterable
        filter-label="Narrow these"
        label="Owner"
      ></helix-headless-listbox>`,
    )
    expect(hasPart(markup, 'search-field')).toBe(true)
    expect(partTag(markup, 'search-field')).toContain('aria-label="Narrow these"')
    expect(partTag(markup, 'search-field')).toContain('placeholder="Narrow these"')
  })

  test('the filter field ships with autofill off, which a list of options wants', () => {
    /* It is a plain text input to the browser, so autofill offers it names and
       addresses over a list that is being narrowed. Off in the served markup,
       so it is off before the upgrade. A token on the list is the hidden
       select's, never the field's. */
    const markup = ssr(
      html`<helix-headless-listbox
        filterable
        autocomplete="country"
        label="Owner"
      ></helix-headless-listbox>`,
    )
    expect(partTag(markup, 'search-field')).toContain('autocomplete="off"')
    expect(rendered(markup, TAG)).toContain('<select aria-hidden="true" autocomplete="country"')
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(
      html`<helix-headless-listbox label="Owner" name="owner"></helix-headless-listbox>`,
    )
    expect(hostAttributes(markup, TAG)).toEqual(['label', 'name'])
  })
})
