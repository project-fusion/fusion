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

const TAG = 'helix-color-input'

const field = html`<helix-color-input
  hint="Any syntax"
  label="Brand"
  name="brand"
  swatches="#ff0000,#00ff00"
  value="#3366ff"
></helix-color-input>`

describe('input color server output', () => {
  test('the field and its input ship, before any script runs', () => {
    expect(hasPart(ssr(field), 'field')).toBe(true)
    expect(hasPart(ssr(field), 'control')).toBe(true)
    expect(hasPart(ssr(field), 'trigger')).toBe(true)
  })

  test('the color is already in the field, so nothing jumps on hydration', () => {
    /* Asked of the input rather than of the document. The consumer wrote
       `value="#3366ff"` on the host, so the same six characters are two lines
       away in markup this element did not render. */
    const tag = partTag(ssr(field), 'control')
    expect(tag).toContain('name="brand"')
    expect(tag).toContain('value="#3366ff"')
  })

  test('the label is served and names the field', () => {
    expect(namesControl(ssr(field))).toBe(true)
    expect(rendered(ssr(field), TAG)).toContain('Brand')
  })

  test('disabled and required are on the served control', () => {
    const tag = partTag(
      ssr(html`<helix-color-input disabled label="Brand" required></helix-color-input>`),
      'control',
    )
    expect(tag).toContain('disabled')
    expect(tag).toContain('required')
  })

  test('the preview carries the color on the server', () => {
    // Not read back from a computed style, which does not exist here: the swatch
    // is painted from a custom property written into the markup.
    expect(partTag(ssr(field), 'preview')).toContain('51 102 255')
  })

  test('the panel is served closed, and says so', () => {
    expect(partTag(ssr(field), 'surface')).toContain('hidden')
    expect(partTag(ssr(field), 'trigger')).toContain('aria-expanded="false"')
  })

  test('the picker ships inside it, rather than being built on hydration', () => {
    expect(partTag(ssr(field), 'picker')).toContain('helix-color-picker')
  })

  test('a swatch serves the trigger as the control, since there is no text field', () => {
    /* The one shape where the label has nothing to point at unless the trigger
       takes the id, and a block of color with no name is a button announced as
       "button". */
    const swatch = ssr(html`<helix-color-input label="Brand" variant="swatch"></helix-color-input>`)
    expect(partTag(swatch, 'trigger')).toContain('id="control"')
    expect(namesControl(swatch)).toBe(true)
  })

  test('the host carries only what the consumer wrote', () => {
    /* `format` reflected and defaulted to `hex`, so the server stamped
       `format="hex"` onto every color input anybody rendered and React, which
       holds no such prop, reported a hydration mismatch for each one. */
    expect(hostAttributes(ssr(field), TAG)).toEqual(['hint', 'label', 'name', 'swatches', 'value'])
  })
})
