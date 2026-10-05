import { describe, expect, test } from 'bun:test'
import { hostAttributes, hostTag, rendered, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const TAG = 'helix-headless-card'

describe('card server output', () => {
  test('the four regions are bare slots, so an omitted one paints nothing', () => {
    /* A `<slot>` is `display: contents`, so an unassigned one generates no box:
       no grid row, no gap. A wrapper would generate one either way, which is
       the empty inset band this arrangement exists to avoid, and the detection
       that would let a wrapper hide itself does not exist. */
    const markup = ssr(html`<helix-headless-card></helix-headless-card>`)
    /* Each slot is a part, Web Awesome's card's region names, and still a
       slot: no wrapper is served. */
    expect(servedParts(markup).sort()).toEqual([
      'body',
      'footer',
      'footer-actions',
      'header',
      'header-actions',
      'media',
    ])
    expect(rendered(markup, TAG)).toContain('<slot name="media" part="media">')
    expect(rendered(markup, TAG)).not.toContain('<div')
  })

  test('`media-placement` reflects, which is the only way the sheet can reach it', () => {
    /* **The property has no behavior of its own.** Nothing in this tier reads
       it: the whole of what it does is put an attribute on the host for
       `:host([media-placement="end"])` in the styled sheet to select on, so the
       reflection *is* the feature and losing it is silent. The rule goes on
       parsing, the property goes on reading back `end`, and the picture stays
       where it was.

       Served rather than written at upgrade, because the rule has to match on
       the first paint or the media moves once the definition lands. */
    const placed = ssr(html`<helix-headless-card media-placement="end"></helix-headless-card>`)
    expect(hostTag(placed, TAG)).toContain('media-placement="end"')
  })

  test('and a card that did not ask carries no attribute at all', () => {
    /* Undefaulted, which is the other half of the same rule: a reflected
       property with a default writes itself onto every card anybody renders,
       and the sheet then has to describe both cases instead of the departure. */
    expect(hostAttributes(ssr(html`<helix-headless-card></helix-headless-card>`), TAG)).toEqual([])
  })
})
