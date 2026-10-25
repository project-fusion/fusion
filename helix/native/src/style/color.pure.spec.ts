import { describe, expect, test } from 'bun:test'
import { mix } from './color.js'

describe('mix', () => {
  test('with transparent, the color keeps its channels and takes the share as alpha', () => {
    expect(mix('#3366cc', 12, 'transparent')).toBe('rgba(51, 102, 204, 0.12)')
  })

  test('two opaque colors meet in OKLab, between the two', () => {
    expect(mix('#ffffff', 50, '#000000')).toBe('rgba(99, 99, 99, 1)')
  })

  test('in sRGB, two colors meet halfway along their encoded channels, as `color-mix(in srgb)` does', () => {
    expect(mix('#ffffff', 50, '#000000', 'srgb')).toBe('rgba(128, 128, 128, 1)')
    expect(mix('#3366cc', 14, '#ffffff', 'srgb')).toBe('rgba(226, 234, 248, 1)')
  })
})
