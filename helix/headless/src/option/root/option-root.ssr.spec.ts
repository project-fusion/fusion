import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('option server output', () => {
  test('the row and its words are in the served markup', () => {
    const markup = ssr(html`<helix-option value="ross">Ross</helix-option>`)
    expect(hasPart(markup, 'item')).toBe(true)
    expect(withoutStyles(markup)).toContain('Ross')
  })

  test('the host carries only what the consumer wrote', () => {
    // `role="option"` and `aria-selected` go through internals, which write no
    // attribute, so the host is the consumer"s markup and hydration agrees.
    expect(
      hostAttributes(ssr(html`<helix-option value="ross">Ross</helix-option>`), 'helix-option'),
    ).toEqual(['value'])
  })

  test('a group serves its own label, which is not one of its options', () => {
    const markup = ssr(html`<helix-option-group label="Engineering"></helix-option-group>`)
    expect(withoutStyles(markup)).toContain('Engineering')
    expect(hasPart(markup, 'items')).toBe(true)
  })
})
