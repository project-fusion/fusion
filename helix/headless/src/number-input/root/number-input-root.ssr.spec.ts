import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  namesControl,
  partTag,
  rendered,
  ssr,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const TAG = 'helix-headless-number-input'

const field = html`<helix-headless-number-input
  default-value="3"
  label="Guests"
  max="9"
  min="1"
></helix-headless-number-input>`

describe('input number server output', () => {
  test('the field and both steppers ship, so it works before any script loads', () => {
    expect(hasPart(ssr(field), 'control')).toBe(true)
    expect(hasPart(ssr(field), 'decrement')).toBe(true)
    expect(hasPart(ssr(field), 'increment')).toBe(true)
  })

  test('the field is text with a numeric keypad, not a native spinner', () => {
    const tag = partTag(ssr(field), 'control')
    expect(tag).toContain('type="text"')
    expect(tag).toContain('inputmode="decimal"')
  })

  test('the number is already in the field, so nothing arrives on hydration', () => {
    // Derived from `defaultValue` on read rather than seeded in a hook SSR does
    // not call, which is what lets the server and the client agree.
    expect(partTag(ssr(field), 'control')).toContain('value="3"')
  })

  test('the range is announced in the served markup', () => {
    const tag = partTag(ssr(field), 'control')
    expect(tag).toContain('role="spinbutton"')
    expect(tag).toContain('aria-valuemin="1"')
    expect(tag).toContain('aria-valuemax="9"')
  })

  test('the label is served and names the field', () => {
    expect(namesControl(ssr(field))).toBe(true)
    expect(rendered(ssr(field), TAG)).toContain('Guests')
  })

  test('disabled, required and read-only are on the served control', () => {
    const tag = partTag(
      ssr(html`<helix-headless-number-input
        disabled
        label="Guests"
        readonly
        required
      ></helix-headless-number-input>`),
      'control',
    )
    expect(tag).toContain('disabled')
    expect(tag).toContain('required')
    expect(tag).toContain('readonly')
  })

  test('a stepper at its bound ships spent, rather than becoming so on hydration', () => {
    const floor = html`<helix-headless-number-input
      default-value="1"
      label="Guests"
      min="1"
    ></helix-headless-number-input>`
    expect(partTag(ssr(floor), 'decrement')).toContain('disabled')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(field), TAG)).toEqual(['default-value', 'label', 'max', 'min'])
  })

  test('both steppers are named, their content being a plus and a minus', () => {
    /* Two glyph-only buttons on every number field in the library. Unnamed they
       announce as "button" twice over, which is the second most common way a
       form becomes unusable without sight after an unlabeled field.

       Words the component does not default to, `decrementLabel` holding
       "Decrease" and `incrementLabel` "Increase": read against those, the
       assertion passes against a template writing the literals and says nothing
       about either property. */
    const stepped = html`<helix-headless-number-input
      label="Guests"
      decrement-label="One fewer"
      increment-label="One more"
    ></helix-headless-number-input>`
    expect(partTag(ssr(stepped), 'decrement')).toContain('aria-label="One fewer"')
    expect(partTag(ssr(stepped), 'increment')).toContain('aria-label="One more"')
  })

  test('the placeholder and the autofill token reach the control', () => {
    /* The control is a text input wearing `role="spinbutton"`, so autofill
       treats it as a line of text unless the consumer names a token, and both
       are read off the parsed markup rather than after the upgrade. */
    const hinted = html`<helix-headless-number-input
      label="Guests"
      placeholder="how many"
      autocomplete="off"
    ></helix-headless-number-input>`
    expect(partTag(ssr(hinted), 'control')).toContain('placeholder="how many"')
    expect(partTag(ssr(hinted), 'control')).toContain('autocomplete="off"')
  })
})
