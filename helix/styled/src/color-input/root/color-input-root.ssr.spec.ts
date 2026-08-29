import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const markup = withoutStyles(
  ssr(html`<helix-color-input
  hint="Any syntax"
  label="Brand"
  name="brand"
  swatches="#ff0000,#00ff00"
  value="#3366ff"
></helix-color-input>`),
)

describe('input color server output', () => {
  test('the field and its input ship, before any script runs', () => {
    expect(hasPart(markup, 'field')).toBe(true)
    expect(hasPart(markup, 'control')).toBe(true)
    expect(hasPart(markup, 'trigger')).toBe(true)
  })

  test('the color is already in the field, so nothing jumps on hydration', () => {
    expect(partTag(markup, 'control')).toContain('name="brand"')
    expect(markup).toContain('#3366ff')
  })

  test('the preview carries the color on the server', () => {
    // Not read back from a computed style, which does not exist here: the swatch
    // is painted from a custom property written into the markup.
    expect(partTag(markup, 'preview')).toContain('51 102 255')
  })

  test('the panel is served closed, and says so', () => {
    expect(partTag(markup, 'surface')).toContain('hidden')
    expect(partTag(markup, 'trigger')).toContain('aria-expanded="false"')
  })

  test('the picker ships inside it, rather than being built on hydration', () => {
    expect(partTag(markup, 'picker')).toContain('helix-color-picker')
  })

  test('the host carries only what the consumer wrote', () => {
    /* `format` reflected and defaulted to `hex`, so the server stamped
       `format="hex"` onto every color input anybody rendered and React, which
       holds no such prop, reported a hydration mismatch for each one. */
    expect(hostAttributes(markup, 'helix-color-input')).toEqual([
      'hint',
      'label',
      'name',
      'swatches',
      'value',
    ])
  })
})
