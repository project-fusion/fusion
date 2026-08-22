import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('textarea server output', () => {
  test('the control ships, so the field is usable before hydration', () => {
    const markup = ssr(html`<helix-base-textarea label="Notes"></helix-base-textarea>`)
    expect(hasPart(markup, 'field')).toBe(true)
    expect(partTag(markup, 'control')).toMatch(/<textarea/)
  })

  test('the label is in the served HTML', () => {
    expect(
      withoutStyles(ssr(html`<helix-base-textarea label="Notes"></helix-base-textarea>`)),
    ).toContain('Notes')
  })

  test('rows reaches the textarea rather than staying on the host', () => {
    expect(
      partTag(ssr(html`<helix-base-textarea rows="6"></helix-base-textarea>`), 'control'),
    ).toContain('6')
  })

  test('the hint ships and the feedback does not, because nothing has failed yet', () => {
    const markup = ssr(html`<helix-base-textarea hint="Two lines"></helix-base-textarea>`)
    expect(hasPart(markup, 'hint')).toBe(true)
    expect(hasPart(markup, 'feedback')).toBe(false)
  })
})
