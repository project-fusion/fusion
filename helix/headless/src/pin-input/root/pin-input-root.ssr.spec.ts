import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const code = html`<helix-headless-pin-input label="Code" length="4"></helix-headless-pin-input>`

describe('input pin server output', () => {
  test('every box and the field ship, so the code can be typed before any script loads', () => {
    const markup = rendered(ssr(code), 'helix-headless-pin-input')
    expect(hasPart(ssr(code), 'cell')).toBe(true)
    expect([...markup.matchAll(/part="cell[ "]/g)]).toHaveLength(4)
    expect([...markup.matchAll(/<input\b/g)]).toHaveLength(1)
  })

  test('the field asks for the code and is named by the label', () => {
    const markup = rendered(ssr(code), 'helix-headless-pin-input')
    expect([...markup.matchAll(/autocomplete="one-time-code"/g)]).toHaveLength(1)
    expect(partTag(ssr(code), 'label')).toMatch(/^<label\b[^>]*for="/)
  })

  test('a seeded code is already drawn in its boxes', () => {
    /* The boxes are drawn from the code, so a server draws them too, where a
       row of fields waited for a script to fill in their values. */
    const seeded = html`<helix-headless-pin-input
      default-value="1234"
      label="Code"
      length="4"
    ></helix-headless-pin-input>`
    const markup = rendered(ssr(seeded), 'helix-headless-pin-input')
    const drawn = [...markup.matchAll(/<div[^>]*part="cell[^"]*"[^>]*>(?:<!--[^>]*-->)*([^<]*)/g)]
    expect(drawn.map(([, text]) => text?.trim())).toEqual(['1', '2', '3', '4'])
  })

  test('the boxes are hidden from a screen reader', () => {
    expect(partTag(ssr(code), 'cell')).toContain('aria-hidden="true"')
    expect(partTag(ssr(code), 'field')).not.toContain('role=')
  })

  test('the placeholder is drawn in every empty box', () => {
    const dotted = html`<helix-headless-pin-input
      label="Code"
      length="4"
      placeholder="0"
    ></helix-headless-pin-input>`
    const markup = rendered(ssr(dotted), 'helix-headless-pin-input')
    expect([...markup.matchAll(/part="placeholder"/g)]).toHaveLength(4)
  })

  test('the host carries only what the consumer wrote', () => {
    /* `type` must not reflect: it would write `type="numeric"` onto every pin,
       an attribute no consumer's markup has. */
    expect(hostAttributes(ssr(code), 'helix-headless-pin-input')).toEqual(['label', 'length'])
  })
})
