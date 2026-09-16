import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const code = html`<helix-headless-pin-input label="Code" length="4"></helix-headless-pin-input>`

describe('input pin server output', () => {
  test('every box ships, so the field is usable before any script loads', () => {
    const markup = rendered(ssr(code), 'helix-headless-pin-input')
    expect(hasPart(ssr(code), 'cell')).toBe(true)
    expect([...markup.matchAll(/part="cell"/g)]).toHaveLength(4)
  })

  test('the first box asks for the code in the served markup', () => {
    // A hint about the field as a whole, so repeating it would offer a browser
    // four places to put one code.
    const markup = rendered(ssr(code), 'helix-headless-pin-input')
    expect([...markup.matchAll(/autocomplete="one-time-code"/g)]).toHaveLength(1)
  })

  test('a seeded code is already in its boxes', () => {
    // `partTag` answers about the first box, which is where the first character
    // belongs. Against the whole render the seed and the boxes are impossible
    // to tell apart, the host carrying `default-value="1234"` itself.
    const seeded = html`<helix-headless-pin-input
      default-value="1234"
      label="Code"
      length="4"
    ></helix-headless-pin-input>`
    expect(partTag(ssr(seeded), 'cell')).toContain('value="1"')
  })

  test('the row is a group, and the boxes are named', () => {
    expect(partTag(ssr(code), 'field')).toContain('role="group"')
    expect(partTag(ssr(code), 'cell')).toContain('aria-label="Character 1 of 4"')
  })

  test('the host carries only what the consumer wrote', () => {
    /* `type` must not reflect: it would write `type="numeric"` onto every pin,
       an attribute no consumer's markup has. Reflection exists so a selector
       can reach a value, and no rule selects on this one. */
    expect(hostAttributes(ssr(code), 'helix-headless-pin-input')).toEqual(['label', 'length'])
  })
})
