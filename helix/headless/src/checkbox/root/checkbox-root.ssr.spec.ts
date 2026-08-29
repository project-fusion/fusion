import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
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

  test('a default-checked box is checked on the server, in the control', () => {
    /* Anything that waited for a lifecycle hook would render unchecked here and
       change at hydration.

       Asked of the `<input>`, the checked state living in
       `ElementInternals.states`, which no server writes. The control is the
       half that has to be right anyway: it is what carries the state into a
       form and what a reader is shown. */
    const markup = withoutStyles(
      ssr(html`<helix-headless-checkbox default-checked>x</helix-headless-checkbox>`),
    )
    expect(partTag(markup, 'control')).toContain('checked')
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(html`<helix-headless-checkbox name="terms">Terms</helix-headless-checkbox>`)
    expect(hostAttributes(markup, 'helix-headless-checkbox')).toEqual(['name'])
  })
})
