import { describe, expect, test } from 'bun:test'
import { hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('stat server output', () => {
  test('the figure, its label and its unit each have a slot to arrive through', () => {
    /* `toContain('Revenue')` and `toContain('42')` were the spec's own
       light-DOM children read back out of the document, so both held for a stat
       that rendered nothing whatever. Stat renders no part at all, so what a
       server owes is the three slots, read off a render with no children. */
    const markup = rendered(
      ssr(html`<helix-headless-stat></helix-headless-stat>`),
      'helix-headless-stat',
    )
    /* The label's slot carries a listener, which the server leaves out. */
    expect(markup).toMatch(/<slot name="label"\s*><\/slot>/)
    expect(markup).toContain('<slot part="value"></slot>')
    expect(markup).toContain('<slot name="unit"></slot>')
    expect(markup).toContain('<slot name="trend"></slot>')
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-headless-stat><span>42</span></helix-headless-stat>`),
        'helix-headless-stat',
      ),
    ).toEqual([])
  })
})
