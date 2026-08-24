import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('checkbox server output', () => {
  test('the control ships as an input, so it works before any script', () => {
    const markup = ssr(html`<helix-headless-checkbox name="terms">Terms</helix-headless-checkbox>`)
    expect(partTag(markup, 'control')).toContain('type="checkbox"')
  })

  test('the label is in the served markup', () => {
    expect(
      withoutStyles(ssr(html`<helix-headless-checkbox>Terms</helix-headless-checkbox>`)),
    ).toContain('Terms')
  })

  test('a default-checked box is checked on the server', () => {
    // Anything that waited for a lifecycle hook would render unchecked here and
    // change at hydration.
    const markup = withoutStyles(
      ssr(html`<helix-headless-checkbox default-checked>x</helix-headless-checkbox>`),
    )
    expect(markup).toContain('data-checked')
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(html`<helix-headless-checkbox name="terms">Terms</helix-headless-checkbox>`)
    expect(hostAttributes(markup, 'helix-headless-checkbox')).toEqual(['name'])
  })
})
