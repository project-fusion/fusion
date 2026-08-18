import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, ssr } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const markup = ssr(html`<helix-input-color
  hint="Any syntax"
  label="Brand"
  name="brand"
  swatches="#ff0000,#00ff00"
  value="#3366ff"
></helix-input-color>`)

describe('input color server output', () => {
  test('the field and its input ship, before any script runs', () => {
    expect(hasPart(markup, 'field')).toBe(true)
    expect(hasPart(markup, 'control')).toBe(true)
    expect(hasPart(markup, 'trigger')).toBe(true)
  })

  test('the colour is already in the field, so nothing jumps on hydration', () => {
    expect(partTag(markup, 'control')).toContain('name="brand"')
    expect(markup).toContain('#3366ff')
  })

  test('the preview carries the colour on the server', () => {
    // Not read back from a computed style, which does not exist here: the swatch
    // is painted from a custom property written into the markup.
    expect(partTag(markup, 'preview')).toContain('51 102 255')
  })

  test('the panel is served closed, and says so', () => {
    expect(partTag(markup, 'surface')).toContain('hidden')
    expect(partTag(markup, 'trigger')).toContain('aria-expanded="false"')
  })

  test('the picker ships inside it, rather than being built on hydration', () => {
    expect(partTag(markup, 'picker')).toContain('helix-color')
  })
})
