import { describe, expect, test } from 'bun:test'
import { rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import './input/index.js'
import './select/index.js'

/**
 * A field a server renders already failing is sent failing.
 *
 * Bound in the template beside `aria-describedby` for this reason: a state
 * written after an update would reach the control only once the element had
 * upgraded, and a declarative shadow root is read before then.
 */
describe('a field served with a message', () => {
  test('its control says it is invalid', () => {
    const markup = ssr(
      html`<helix-headless-input label="Name" feedback="Too short"></helix-headless-input>`,
    )
    expect(rendered(markup, 'helix-headless-input')).toMatch(/<input[^>]*aria-invalid="true"/)
  })

  test('and a field without one says nothing', () => {
    const markup = ssr(html`<helix-headless-select label="Region"></helix-headless-select>`)
    expect(rendered(markup, 'helix-headless-select')).not.toContain('aria-invalid')
  })
})
