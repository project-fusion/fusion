import { describe, expect, test } from 'bun:test'
import type { ColorBytes } from '@fusion.dev/helix-core'
import { type PaletteStyle, paletteOf, RESTING_PALETTE } from './palette.js'

/** A reader that knows a few named colors, the way the engine resolves them. */
const BYTES: Record<string, ColorBytes> = {
  black: [0, 0, 0],
  blue: [0, 0, 255],
  navy: [0, 0, 128],
  red: [255, 0, 0],
  white: [255, 255, 255],
}
const read = (value: string): ColorBytes | undefined => BYTES[value]

const style = (overrides: Partial<PaletteStyle>): PaletteStyle => ({
  caretColor: 'white',
  color: 'blue',
  columnRuleColor: 'navy',
  outlineColor: 'black',
  textDecorationColor: 'red',
  ...overrides,
})

describe('paletteOf', () => {
  test('each stop is the color its property carries, as channels', () => {
    expect(paletteOf(style({}), read)).toEqual({
      glow: [0, 0, 1],
      ground: [0, 0, 0],
      haze: [1, 0, 0],
      peak: [1, 1, 1],
    })
  })

  test('a light ground peaks on the light page color, and a dark one on the dark page color', () => {
    expect(paletteOf(style({ outlineColor: 'white' }), read).peak).toEqual([0, 0, 128 / 255])
    expect(paletteOf(style({ outlineColor: 'black' }), read).peak).toEqual([1, 1, 1])
  })

  test('a color that cannot be read keeps the resting stop', () => {
    const palette = paletteOf(style({ color: 'nonsense', outlineColor: 'nonsense' }), read)
    expect(palette.glow).toEqual(RESTING_PALETTE.glow)
    expect(palette.ground).toEqual(RESTING_PALETTE.ground)
  })
})
