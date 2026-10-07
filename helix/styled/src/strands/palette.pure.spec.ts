import { describe, expect, test } from 'bun:test'
import type { ColorBytes } from '@fusion.dev/helix-core'
import { paletteOf, RESTING_PALETTE, type StrandsPaletteStyle } from './palette.js'

/** Reads `rgb(r, g, b)`, the form a computed color comes back in, and nothing else. */
const read = (value: string): ColorBytes | undefined => {
  const match = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(value)
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : undefined
}

const style = (ground: string): StrandsPaletteStyle => ({
  caretColor: 'rgb(123, 173, 255)',
  color: 'rgb(66, 138, 254)',
  columnRuleColor: 'rgb(0, 72, 174)',
  outlineColor: ground,
  textDecorationColor: 'rgb(0, 140, 205)',
})

describe('strands palette', () => {
  test('a dark ground adds light toward the dark page peak', () => {
    const palette = paletteOf(style('rgb(8, 9, 12)'), read)
    expect(palette.light).toBe(false)
    expect(palette.peak).toEqual([123 / 255, 173 / 255, 1])
    expect(palette.glow).toEqual([66 / 255, 138 / 255, 254 / 255])
    expect(palette.tint).toEqual([0, 140 / 255, 205 / 255])
  })

  test('a light ground darkens toward the light page peak, as ink', () => {
    const palette = paletteOf(style('rgb(247, 248, 250)'), read)
    expect(palette.light).toBe(true)
    expect(palette.peak).toEqual([0, 72 / 255, 174 / 255])
  })

  test('a color it cannot read keeps the resting palette rather than drawing black', () => {
    const palette = paletteOf(
      {
        caretColor: 'nonsense',
        color: 'nonsense',
        columnRuleColor: 'nonsense',
        outlineColor: 'nonsense',
        textDecorationColor: 'nonsense',
      },
      read,
    )
    expect(palette).toEqual({ ...RESTING_PALETTE })
  })
})
