import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('checkbox server output', () => {
  test('the control ships as an input, so it works before any script', () => {
    const markup = ssr(html`<helix-checkbox name="terms">Terms</helix-checkbox>`)
    expect(partTag(markup, 'control')).toContain('type="checkbox"')
  })

  test('the label is in the served markup', () => {
    expect(withoutStyles(ssr(html`<helix-checkbox>Terms</helix-checkbox>`))).toContain('Terms')
  })

  test('a default-checked box is checked on the server', () => {
    // Anything that waited for a lifecycle hook would render unchecked here and
    // change at hydration.
    const markup = withoutStyles(ssr(html`<helix-checkbox default-checked>x</helix-checkbox>`))
    expect(markup).toContain('data-checked')
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(html`<helix-checkbox name="terms">Terms</helix-checkbox>`)
    expect(hostAttributes(markup, 'helix-checkbox')).toEqual(['name'])
  })
})
