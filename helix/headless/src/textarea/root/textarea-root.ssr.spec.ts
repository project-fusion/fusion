import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('textarea server output', () => {
  test('the control ships, so the field is usable before hydration', () => {
    const markup = ssr(html`<helix-headless-textarea label="Notes"></helix-headless-textarea>`)
    expect(hasPart(markup, 'field')).toBe(true)
    expect(partTag(markup, 'control')).toMatch(/<textarea/)
  })

  test('the label is in the served HTML', () => {
    // Against the whole render this passed on the consumer's own `label="Notes"`
    // in the host tag. The words are the fallback of the label slot, which is
    // in the shadow root and nowhere else.
    const markup = ssr(html`<helix-headless-textarea label="Notes"></helix-headless-textarea>`)
    expect(hasPart(markup, 'label')).toBe(true)
    expect(rendered(markup, 'helix-headless-textarea')).toContain('Notes')
  })

  test('rows reaches the textarea rather than staying on the host', () => {
    expect(
      partTag(ssr(html`<helix-headless-textarea rows="6"></helix-headless-textarea>`), 'control'),
    ).toContain('rows="6"')
  })

  test('the hint ships and the feedback does not, because nothing has failed yet', () => {
    const markup = ssr(html`<helix-headless-textarea hint="Two lines"></helix-headless-textarea>`)
    expect(hasPart(markup, 'hint')).toBe(true)
    expect(hasPart(markup, 'feedback')).toBe(false)
  })
})
