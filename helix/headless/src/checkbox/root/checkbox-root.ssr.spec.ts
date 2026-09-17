import { describe, expect, test } from 'bun:test'
import {
  hostAttributes,
  partTag,
  rendered,
  ssr,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('checkbox server output', () => {
  test('the control ships as an input, so it works before any script', () => {
    const markup = ssr(html`<helix-headless-checkbox name="terms">Terms</helix-headless-checkbox>`)
    expect(partTag(markup, 'control')).toContain('type="checkbox"')
  })

  test('the slot the label lands in is served', () => {
    /* `toContain('Terms')` read the host's own light-DOM child back out of the
       render, so it passed with the checkbox rendering no slot at all. Read off
       a checkbox with no children: the only shadow root is its own. */
    const markup = ssr(html`<helix-headless-checkbox></helix-headless-checkbox>`)
    expect(rendered(markup, 'helix-headless-checkbox')).toMatch(
      /<span part="label">(<!--[^>]*-->)*<slot\s*>/,
    )
  })

  test('the server says checked on a ticked box and says nothing on an unticked one', () => {
    /* Anything that waited for a lifecycle hook would render unchecked here and
       change at hydration.

       Asked of the `<input>`, the checked state living in
       `ElementInternals.states`, which no server writes. The control is the
       half that has to be right anyway: it is what carries the state into a
       form and what a reader is shown.

       **Both polarities, because only the unticked one can fail.** `checked` is
       a boolean attribute and is true wherever it is present, so an unticked box
       is the absence and nothing else. This asked the ticked case alone and
       would have passed inverted: it held while every unticked box on every
       server shipped `checked="false"`, which is a ticked box to a reader. */
    const ticked = withoutStyles(
      ssr(html`<helix-headless-checkbox default-checked>x</helix-headless-checkbox>`),
    )
    expect(partTag(ticked, 'control')).toContain('checked')
    const unticked = withoutStyles(ssr(html`<helix-headless-checkbox>x</helix-headless-checkbox>`))
    expect(partTag(unticked, 'control')).not.toContain('checked')
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(html`<helix-headless-checkbox name="terms">Terms</helix-headless-checkbox>`)
    expect(hostAttributes(markup, 'helix-headless-checkbox')).toEqual(['name'])
  })
})
