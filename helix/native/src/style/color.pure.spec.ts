import { describe, expect, test } from 'bun:test'
import { mix, writtenColor } from './color.js'

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

describe('writtenColor', () => {
  const read = (name: string) =>
    ({ 'helix-color-background': '#ffffff', 'helix-color-success': '#3366cc' })[name]

  test('a mix reads its variables and works out as `color-mix()` does', () => {
    expect(
      writtenColor('color-mix(in oklab, var(--helix-color-success) 12%, transparent)', read),
    ).toBe('rgba(51, 102, 204, 0.12)')
    expect(
      writtenColor(
        'color-mix(in srgb, var(--helix-color-success) 14%, var(--helix-color-background))',
        read,
      ),
    ).toBe('rgba(226, 234, 248, 1)')
  })

  test('the second side may write the share, and a mix may hold a mix', () => {
    expect(writtenColor('color-mix(in oklab, #3366cc, transparent 88%)', read)).toBe(
      'rgba(51, 102, 204, 0.12)',
    )
    expect(
      writtenColor(
        'color-mix(in srgb, color-mix(in srgb, #ffffff, #ffffff) 14%, #3366cc 86%)',
        read,
      ),
    ).toBe(mix('#ffffff', 14, '#3366cc', 'srgb'))
  })

  test('a variable takes its fallback, and one that reads nothing leaves no color', () => {
    expect(writtenColor('var(--unknown, #3366cc)', read)).toBe('#3366cc')
    expect(
      writtenColor('color-mix(in oklab, var(--unknown) 12%, transparent)', read),
    ).toBeUndefined()
  })

  test('a mix in a space a phone does not work in leaves no color', () => {
    expect(writtenColor('color-mix(in oklch, #3366cc 12%, transparent)', read)).toBeUndefined()
  })
})
