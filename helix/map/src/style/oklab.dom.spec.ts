import { describe, expect, test } from 'bun:test'
import { contrast, cssColor, mix, parseColor, rehue } from './oklab.js'

describe('the color arithmetic', () => {
  test('reads hex and rgb in the forms a style is handed', () => {
    expect(parseColor('#fff')).toEqual({ alpha: 1, blue: 1, green: 1, red: 1 })
    expect(cssColor(parseColor('#1d6fd8') ?? { alpha: 0, blue: 0, green: 0, red: 0 })).toBe(
      'rgb(29, 111, 216)',
    )
    expect(parseColor('rgba(10, 20, 30, 0.5)')?.alpha).toBe(0.5)
    expect(parseColor('rgb(10 20 30 / 50%)')?.alpha).toBe(0.5)
    expect(parseColor('oklch(50% 0.1 200)')).toBeUndefined()
  })

  test('a mix is each end at its ends and in between between them', () => {
    const black = parseColor('#000000')
    const white = parseColor('#ffffff')
    if (!black || !white) {
      throw new Error('unparsed')
    }
    expect(cssColor(mix(black, white, 0))).toBe('rgb(0, 0, 0)')
    expect(cssColor(mix(black, white, 1))).toBe('rgb(255, 255, 255)')
    // What `color-mix(in oklab, black, white)` gives, lightness 0.5 in OKLab.
    expect(cssColor(mix(black, white, 0.5))).toBe('rgb(99, 99, 99)')
  })

  test('a color turned to another hue keeps how light it is, and a gray still takes a hue', () => {
    const brand = parseColor('#2563eb') as NonNullable<ReturnType<typeof parseColor>>
    const white = parseColor('#ffffff') as NonNullable<ReturnType<typeof parseColor>>
    const pink = rehue(brand, 350)
    // As far from white as the brand is, to within a little of the gamut's clipping.
    expect(Math.abs(contrast(pink, white) - contrast(brand, white))).toBeLessThan(0.6)
    expect(pink.red).toBeGreaterThan(pink.blue)
    const gray = rehue(parseColor('#777777') as typeof brand, 145)
    expect(gray.green).toBeGreaterThan(gray.red)
  })
})
