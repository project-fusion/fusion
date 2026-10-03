import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('tag server output', () => {
  test('the label is projected, and a glyph before it has a name to be styled by', () => {
    /* `toContain('Draft')` against the whole render passed on the word the spec
       itself slotted, which is the consumer's markup echoed back: it held with
       the tag rendering no slot at all. Read off a render with no children, the
       only shadow root in the markup is the tag's own. */
    const markup = rendered(
      ssr(html`<helix-headless-tag></helix-headless-tag>`),
      'helix-headless-tag',
    )
    expect(markup).toContain('<slot name="start" part="start"></slot>')
    expect(markup).toContain('<slot part="label"></slot>')
  })

  test('a plain tag ships no control', () => {
    expect(hasPart(ssr(html`<helix-headless-tag>Draft</helix-headless-tag>`), 'dismiss')).toBe(
      false,
    )
  })

  test('the dismiss control is named before any JavaScript runs', () => {
    const markup = ssr(html`<helix-headless-tag dismissible>Draft</helix-headless-tag>`)
    expect(partTag(markup, 'dismiss')).toContain('aria-label="Remove"')
  })
})
