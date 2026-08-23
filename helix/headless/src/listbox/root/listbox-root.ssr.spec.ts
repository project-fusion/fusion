import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('listbox server output', () => {
  test('the items region ships with its tab stop', () => {
    // One stop for the whole list, and it is in the served markup, so a
    // keyboard reader can reach the list before any script has run.
    const items = partTag(
      ssr(html`<helix-base-listbox label="Owner"></helix-base-listbox>`),
      'items',
    )
    expect(items).toMatch(/<div/)
    expect(items).toContain('0')
  })

  test('a disabled list ships out of the tab order', () => {
    expect(
      partTag(ssr(html`<helix-base-listbox disabled></helix-base-listbox>`), 'items'),
    ).toContain('-1')
  })

  test('the empty state does not ship, because emptiness is a fact about children', () => {
    // The server has no tree to count, and rendering "no matches" over a list
    // that does have options would be worse than not rendering it at all.
    expect(
      hasPart(ssr(html`<helix-base-listbox label="Owner"></helix-base-listbox>`), 'empty'),
    ).toBe(false)
  })

  test('the group label is in the served HTML', () => {
    expect(
      withoutStyles(ssr(html`<helix-base-listbox label="Owner"></helix-base-listbox>`)),
    ).toContain('Owner')
  })
})
