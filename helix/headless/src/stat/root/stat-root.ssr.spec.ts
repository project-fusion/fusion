import { describe, expect, test } from 'bun:test'
import { hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('stat server output', () => {
  test('the figure, its label and its unit each have a slot to arrive through', () => {
    /* `toContain('Revenue')` and `toContain('42')` were the spec's own
       light-DOM children read back out of the document, so both held for a stat
       that rendered nothing whatever. Stat renders slots and nothing else, so what a
       server owes is the three slots, read off a render with no children. */
    const markup = rendered(
      ssr(html`<helix-headless-stat></helix-headless-stat>`),
      'helix-headless-stat',
    )
    /* The label's slot carries a listener, which the server leaves out. */
    expect(markup).toMatch(/<slot name="label" part="label"\s*><\/slot>/)
    expect(markup).toContain('<slot part="value"></slot>')
    expect(markup).toMatch(/<slot name="unit" part="unit"\s*><\/slot>/)
    expect(markup).toMatch(/<slot name="trend" part="trend"\s*><\/slot>/)
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-headless-stat><span>42</span></helix-headless-stat>`),
        'helix-headless-stat',
      ),
    ).toEqual([])
  })

  test('a figure given as a number is written on the server', () => {
    const markup = rendered(
      ssr(html`<helix-headless-stat locale="en" value="98.5"></helix-headless-stat>`),
      'helix-headless-stat',
    )
    expect(markup).toMatch(/<span part="value">(<!--[^>]*-->)*98\.5(<!--[^>]*-->)*<\/span>/)
  })
})
