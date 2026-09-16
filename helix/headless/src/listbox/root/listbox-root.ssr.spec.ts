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

  test('and does not point at the list, because a group has nothing to point at', () => {
    /* The one place this cohort's frame differs, and it is said rather than
       skipped. A field's label is a `<label for>` naming the control beside it;
       a list is a set, so `MixinField` renders a plain `<span>` and the name
       reaches the host through `ElementInternals`, which no server writes. So
       the served list carries the words and no accessible name until it
       upgrades, and a spec asserting one would be asserting something no server
       output has. */
    const markup = ssr(html`<helix-headless-listbox label="Owner"></helix-headless-listbox>`)
    expect(namesControl(markup)).toBe(false)
    expect(partTag(markup, 'items')).not.toContain('aria-label')
  })

  test('the filter ships with the list, not after it', () => {
    // A field that arrived on hydration is a list a reader started scrolling
    // before finding out it could be narrowed.
    const markup = ssr(
      html`<helix-headless-listbox filterable label="Owner"></helix-headless-listbox>`,
    )
    expect(hasPart(markup, 'search-field')).toBe(true)
    expect(partTag(markup, 'search-field')).toContain('aria-label="Filter"')
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(
      html`<helix-headless-listbox label="Owner" name="owner"></helix-headless-listbox>`,
    )
    expect(hostAttributes(markup, TAG)).toEqual(['label', 'name'])
  })
})
