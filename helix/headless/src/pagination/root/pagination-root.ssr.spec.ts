import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('pagination server output', () => {
  test('the two end controls are named, their content being a double caret', () => {
    /* Four glyph-only controls in a row, and these are the two `ends` adds.
       Unnamed they announce as "button" beside two others announcing the same
       thing, which is a row nobody reading by ear can tell apart.

       Words the component does not default to, `firstLabel` holding "First
       page" and `lastLabel` "Last page": read against those the assertion is
       satisfied by a template writing the literals and says nothing about
       either property. */
    const row = html`<helix-headless-pagination
      pages="9"
      current="4"
      ends
      first-label="Back to the start"
      last-label="Jump to the end"
    ></helix-headless-pagination>`
    expect(partTag(ssr(row), 'first')).toContain('aria-label="Back to the start"')
    expect(partTag(ssr(row), 'last')).toContain('aria-label="Jump to the end"')
  })

  test('and a row without `ends` renders neither, rather than naming them', () => {
    // The two are the pair `ends` switches on, so the names have nothing to be
    // on until it does.
    const row = html`<helix-headless-pagination pages="9" current="4"></helix-headless-pagination>`
    expect(hasPart(ssr(row), 'first')).toBe(false)
    expect(hasPart(ssr(row), 'last')).toBe(false)
  })

  test('the end controls are served inert at the end they point at', () => {
    /* Inert rather than absent: a control that disappears on the first page
       takes the row's width with it and moves everything else under the
       pointer. It has to be the served state too, or the row reflows once on
       hydration for every reader who lands on page one. */
    const first = html`<helix-headless-pagination
      pages="9"
      current="1"
      ends
    ></helix-headless-pagination>`
    expect(partTag(ssr(first), 'first')).toContain('disabled')
    expect(partTag(ssr(first), 'last')).not.toContain('disabled')
  })
})
