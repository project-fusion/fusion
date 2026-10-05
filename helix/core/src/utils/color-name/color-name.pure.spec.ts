import { describe, expect, test } from 'bun:test'
import { COLOR_WORDS, colorName, hueName } from './color-name.js'

/** A color as the picker holds it, from a hue and the two square axes. */
const hsb = (hue: number, saturation = 100, brightness = 100, alpha = 100) => ({
  alpha,
  brightness,
  hue,
  saturation,
})

describe('colorName', () => {
  /* The readings React Aria's getColorName gives for the same colors, from the
     same OKLCH thresholds. */
  test('names a color by its lightness, its chroma and its hue', () => {
    expect(colorName(hsb(0))).toBe('vibrant red')
    expect(colorName(hsb(240))).toBe('dark vibrant blue')
    expect(colorName(hsb(120))).toBe('very light vibrant green')
    expect(colorName(hsb(25, 86, 55))).toBe('dark brown')
  })

  test('says white, black and gray as themselves', () => {
    expect(colorName(hsb(0, 0, 100))).toBe('white')
    expect(colorName(hsb(0, 0, 0))).toBe('black')
    expect(colorName(hsb(0, 0, 50))).toBe('gray')
  })

  test('joins two hue names past the middle of a span', () => {
    expect(colorName(hsb(39))).toBe('vibrant orange yellow')
  })

  test('says how transparent a color is, in the locale', () => {
    expect(colorName(hsb(0, 100, 100, 50))).toBe('vibrant red, 50% transparent')
    expect(colorName(hsb(0, 100, 100, 25), {}, 'de-DE')).toBe('vibrant red, 75 % transparent')
  })

  test('speaks the words it is given, and English for the rest', () => {
    expect(colorName(hsb(0), { red: 'rot' })).toBe('vibrant rot')
    expect(colorName(hsb(0), { colorName: '{hue} ({chroma})', vibrant: 'vif' })).toBe('red (vif)')
  })

  test('has an English word for every key it can reach', () => {
    for (let hue = 0; hue < 360; hue += 5) {
      for (const brightness of [30, 60, 90]) {
        const name = colorName(hsb(hue, 80, brightness))
        expect(name).not.toContain('{')
        expect(name).not.toContain('undefined')
      }
    }
    expect(Object.values(COLOR_WORDS).every((word) => word !== '')).toBe(true)
  })
})

describe('hueName', () => {
  test('names the hue alone', () => {
    expect(hueName(hsb(225))).toBe('cyan blue')
    expect(hueName(hsb(0, 0, 50))).toBe('gray')
  })
})
