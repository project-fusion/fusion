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

  test('the panel is served closed, and says so', () => {
    expect(partTag(markup, 'surface')).toContain('hidden')
    expect(partTag(markup, 'trigger')).toContain('aria-expanded="false"')
  })

  test('the square is painted on first paint, not on the first client render', () => {
    // `#3366ff` is rgb(51, 102, 255): hue 225, saturation 80, brightness 100.
    // The model used to be seeded in `updated`, which never runs here, so every
    // server render shipped a red square under a blue already in the field.
    expect(partTag(markup, 'surface')).toContain('--_hue: 225')
    expect(partTag(markup, 'grid')).toContain('--_saturation: 80%')
    expect(partTag(markup, 'grid')).toContain('--_brightness: 100%')
  })

  test('both axes ship as real inputs, named', () => {
    expect(partTag(markup, 'grid-saturation')).toContain('aria-label="Saturation"')
    expect(partTag(markup, 'grid-brightness')).toContain('aria-label="Brightness"')
  })

  test('the eyedropper is not served, since the server cannot know about it', () => {
    // A button that ships in the markup and does nothing in Firefox is worse
    // than one that is never offered.
    expect(hasPart(markup, 'eyedropper')).toBe(false)
  })

  test('the presets ship, since they are markup rather than state', () => {
    expect(hasPart(markup, 'swatches')).toBe(true)
    expect(markup).toContain('aria-label="#ff0000"')
  })
})
