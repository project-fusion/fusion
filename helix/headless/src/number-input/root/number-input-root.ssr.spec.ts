import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const field = html`<helix-base-number-input
  default-value="3"
  label="Guests"
  max="9"
  min="1"
></helix-base-number-input>`

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

  test('the range is announced in the served markup', () => {
    const tag = partTag(ssr(field), 'control')
    expect(tag).toContain('role="spinbutton"')
    expect(tag).toContain('aria-valuemin="1"')
    expect(tag).toContain('aria-valuemax="9"')
  })

  test('a stepper at its bound ships spent, rather than becoming so on hydration', () => {
    const floor = html`<helix-base-number-input
      default-value="1"
      label="Guests"
      min="1"
    ></helix-base-number-input>`
    expect(partTag(ssr(floor), 'decrement')).toContain('disabled')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(field), 'helix-base-number-input')).toEqual([
      'default-value',
      'label',
      'max',
      'min',
    ])
  })
})
