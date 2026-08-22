import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, ssr } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const markup = ssr(
  html`<helix-color-picker swatches="#ff0000,#00ff00" value="#3366ff"></helix-color-picker>`,
)

describe('color server output', () => {
  test('the square is painted on first paint, not on the first client render', () => {
    // `#3366ff` is rgb(51, 102, 255): hue 225, saturation 80, brightness 100.
    // Seeding the model in `updated` would ship a red square under a blue that
    // is already the value, because `updated` never runs here.
    expect(partTag(markup, 'grid')).toContain('--color-picker-hue: 225')
    expect(partTag(markup, 'grid')).toContain('--color-picker-saturation: 80%')
    expect(partTag(markup, 'grid')).toContain('--color-picker-brightness: 100%')
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
