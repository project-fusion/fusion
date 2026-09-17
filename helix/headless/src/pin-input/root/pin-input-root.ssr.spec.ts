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
    /* Words the component does not default to. `cellLabel` holds
       `Character {index} of {length}`, so reading the filled-in default back
       passes just as well against a template writing that sentence itself, and
       nothing in the assertion would then be about the property. */
    const named = html`<helix-headless-pin-input
      label="Code"
      length="4"
      cell-label="Digit {index} of {length}"
    ></helix-headless-pin-input>`
    expect(partTag(ssr(code), 'field')).toContain('role="group"')
    expect(partTag(ssr(named), 'cell')).toContain('aria-label="Digit 1 of 4"')
  })

  test('the placeholder reaches every box, since the field is a row of them', () => {
    /* One property and as many boxes as there are characters, which is the
       thing worth holding: the platform paints it into each empty cell before
       anything upgrades, so a row where only the first carried it would come up
       looking half-filled. */
    const dotted = html`<helix-headless-pin-input
      label="Code"
      length="4"
      placeholder="0"
    ></helix-headless-pin-input>`
    const cells = [
      ...rendered(ssr(dotted), 'helix-headless-pin-input').matchAll(
        /<input[^>]*part="cell"[^>]*>/g,
      ),
    ]
    expect(cells).toHaveLength(4)
    expect(cells.every(([tag]) => tag.includes('placeholder="0"'))).toBe(true)
  })

  test('the host carries only what the consumer wrote', () => {
    /* `type` must not reflect: it would write `type="numeric"` onto every pin,
       an attribute no consumer's markup has. Reflection exists so a selector
       can reach a value, and no rule selects on this one. */
    expect(hostAttributes(ssr(code), 'helix-headless-pin-input')).toEqual(['label', 'length'])
  })
})
