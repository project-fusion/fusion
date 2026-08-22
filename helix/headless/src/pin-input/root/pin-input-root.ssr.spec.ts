import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const code = html`<helix-base-pin-input label="Code" length="4"></helix-base-pin-input>`

describe('input pin server output', () => {
  test('every box ships, so the field is usable before any script loads', () => {
    const markup = withoutStyles(ssr(code))
    expect(hasPart(ssr(code), 'cell')).toBe(true)
    expect([...markup.matchAll(/part="cell"/g)]).toHaveLength(4)
  })

  test('the first box asks for the code in the served markup', () => {
    // A hint about the field as a whole, so repeating it would offer a browser
    // four places to put one code.
    const markup = withoutStyles(ssr(code))
    expect([...markup.matchAll(/autocomplete="one-time-code"/g)]).toHaveLength(1)
  })

  test('a seeded code is already in its boxes', () => {
    const seeded = html`<helix-base-pin-input
      default-value="1234"
      label="Code"
      length="4"
    ></helix-base-pin-input>`
    expect(withoutStyles(ssr(seeded))).toContain('value="1"')
  })

  test('the row is a group, and the boxes are named', () => {
    expect(partTag(ssr(code), 'field')).toContain('role="group"')
    expect(partTag(ssr(code), 'cell')).toContain('aria-label="Character 1 of 4"')
  })

  test('the host carries only what the consumer wrote', () => {
    /* This is what caught `type` reflecting for nothing: it wrote
       `type="numeric"` onto every pin ever rendered, an attribute no consumer's
       markup had, which is the fault `Input`'s own `type` had. Reflection exists
       so a selector can reach a value, and no rule selects on this one. */
    expect(hostAttributes(ssr(code), 'helix-base-pin-input')).toEqual(['label', 'length'])
  })
})
