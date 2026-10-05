import { describe, expect, test } from 'bun:test'
import { formatColor, parseColor, toCss, toHsl, toRgb } from './css-color.js'

const red = { alpha: 100, brightness: 100, hue: 0, saturation: 100 }

describe('a color read from what a consumer writes', () => {
  test('in every spelling of one color, the same color', () => {
    const seen = ['#f00', '#ff0000', 'rgb(255, 0, 0)', 'rgb(255 0 0)', 'hsl(0, 100%, 50%)']
    for (const one of seen) {
      expect(parseColor(one)).toEqual(red)
    }
  })

  test('with its alpha, from a hex digit pair, a fraction or a percentage', () => {
    expect(parseColor('#ff000080')?.alpha).toBe(50)
    expect(parseColor('rgba(255,0,0,0.5)')?.alpha).toBe(50)
    expect(parseColor('rgb(255 0 0 / 25%)')?.alpha).toBe(25)
  })

  test('and nothing where it is not one', () => {
    expect(parseColor('')).toBeNull()
    expect(parseColor('#ggg')).toBeNull()
    expect(parseColor('#ff00')).not.toBeNull()
    expect(parseColor('#ff000')).toBeNull()
    expect(parseColor('blue')).toBeNull()
    expect(parseColor('rgb(255, 0)')).toBeNull()
  })
})

describe('a color written back', () => {
  test('as red, green and blue, round trip from hex', () => {
    for (const hex of ['#3366cc', '#ff8800', '#000000', '#ffffff', '#808080']) {
      const color = parseColor(hex)
      expect(color).not.toBeNull()
      const { blue, green, red: r } = toRgb(color as NonNullable<typeof color>)
      const byte = (one: number): string => one.toString(16).padStart(2, '0')
      expect(`#${byte(r)}${byte(green)}${byte(blue)}`).toBe(hex)
    }
  })

  test('within a step of each byte, the color being held in whole percents', () => {
    const color = parseColor('#12ab34') as NonNullable<ReturnType<typeof parseColor>>
    const { blue, green, red: r } = toRgb(color)
    expect(Math.abs(r - 0x12)).toBeLessThanOrEqual(1)
    expect(Math.abs(green - 0xab)).toBeLessThanOrEqual(1)
    expect(Math.abs(blue - 0x34)).toBeLessThanOrEqual(1)
  })

  test('as hue, saturation and lightness, round trip from hsl', () => {
    expect(toHsl(parseColor('#3366cc') as NonNullable<ReturnType<typeof parseColor>>)).toEqual({
      hue: 220,
      lightness: 50,
      saturation: 60,
    })
    expect(parseColor('hsl(220, 60%, 50%)')).toEqual({
      alpha: 100,
      brightness: 80,
      hue: 220,
      saturation: 75,
    })
    expect(toHsl(red)).toEqual({ hue: 0, lightness: 50, saturation: 100 })
    expect(toHsl({ alpha: 100, brightness: 0, hue: 0, saturation: 0 })).toEqual({
      hue: 0,
      lightness: 0,
      saturation: 0,
    })
  })

  test('with a hue past either end of the wheel, wrapped onto it', () => {
    expect(toRgb({ alpha: 100, brightness: 100, hue: -120, saturation: 100 })).toEqual({
      blue: 255,
      green: 0,
      red: 0,
    })
    expect(toRgb({ ...red, hue: 360 })).toEqual(toRgb(red))
    expect(toHsl({ ...red, hue: 480 }).hue).toBe(120)
  })

  test('in each format, with its alpha where asked', () => {
    const half = { ...red, alpha: 50 }
    expect(formatColor(red, 'hex', false)).toBe('#ff0000')
    expect(formatColor(half, 'hex', true)).toBe('#ff000080')
    expect(formatColor(half, 'rgb', true)).toBe('rgba(255, 0, 0, 0.5)')
    expect(formatColor(red, 'hsl', false)).toBe('hsl(0, 100%, 50%)')
    expect(toCss(half)).toBe('rgb(255 0 0 / 50%)')
  })
})
