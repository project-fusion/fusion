import { describe, expect, test } from 'bun:test'
import { arcLengths, boxPath, MAX_POINTS, SPREAD } from './path.js'
import { type RibbonFrame, ribbonColors, ribbonMesh } from './ribbon.js'

/** A frame of a ribbon in a 390 by 320 box, as a phone lays one. */
const frameOf = (overrides: Partial<RibbonFrame> = {}): RibbonFrame => {
  const path = boxPath('ribbon', undefined, 320, 390)
  const points = new Float32Array(MAX_POINTS * 4)
  path.forEach((point, i) => {
    points.set(point, i * 4)
  })
  return {
    contrast: 1,
    count: path.length,
    depth: 1,
    dpr: 1.5,
    drift: 1,
    dust: 600,
    lengths: arcLengths(path, 390),
    points,
    range: [0, 1],
    scroll: 0,
    softness: 0,
    spread: SPREAD,
    strands: 300,
    time: 4,
    view: [390, 320],
    ...overrides,
  }
}

describe('ribbonMesh', () => {
  test('lays every strand across every station, two vertices each, joined by two more', () => {
    const mesh = ribbonMesh(frameOf(), 64)
    const vertices = mesh.strips.reduce((sum, strip) => sum + strip.positions.length / 2, 0)
    const joins = mesh.strips.filter((strip) => strip.positions.length > 0).length
    expect(vertices).toBe(300 * 65 * 2 + (300 - joins) * 2)
    for (const strip of mesh.strips) {
      expect(strip.profile.length).toBe(strip.positions.length)
    }
  })

  test('most strands are the glow, a few the tint, and fewer the peak', () => {
    const counts = ribbonMesh(frameOf(), 8).strips.map((strip) => strip.positions.length)
    const [glow = 0, tint = 0, peak = 0] = counts
    expect(glow).toBeGreaterThan(tint)
    expect(tint).toBeGreaterThan(0)
    expect(peak).toBeGreaterThan(0)
  })

  test('every number is finite, every light at least zero, and the ribbon stays near its box', () => {
    const mesh = ribbonMesh(frameOf(), 32)
    for (const strip of [...mesh.strips, mesh.dust]) {
      for (const value of [...strip.positions, ...strip.profile]) {
        expect(Number.isFinite(value)).toBe(true)
      }
    }
    for (const strip of mesh.strips) {
      for (let i = 1; i < strip.profile.length; i += 2) {
        expect(strip.profile[i] ?? -1).toBeGreaterThanOrEqual(0)
      }
      for (let i = 0; i < strip.positions.length; i += 2) {
        expect(strip.positions[i] ?? 0).toBeGreaterThan(-390)
        expect(strip.positions[i] ?? 0).toBeLessThan(780)
      }
    }
  })

  test('the dust is a square a speck, with its light at every vertex', () => {
    const { dust } = ribbonMesh(frameOf({ dust: 10 }), 8)
    expect(dust.positions.length).toBe((10 * 4 + 9 * 2) * 2)
    expect(dust.light.length).toBe(dust.positions.length / 2)
  })

  test('it moves with time, and draws nothing where no stretch of the path shows', () => {
    const at = (time: number) => ribbonMesh(frameOf({ time }), 8).strips[0].positions.slice(0, 4)
    expect(at(1)).not.toEqual(at(2))
    const empty = ribbonMesh(frameOf({ range: [0.5, 0.5] }), 8)
    expect(empty.strips.every((strip) => strip.positions.length === 0)).toBe(true)
    expect(empty.dust.positions).toHaveLength(0)
  })
})

describe('ribbonColors', () => {
  test('the tint is mostly the tint, and the peak lifts either toward the peak', () => {
    const colors = ribbonColors({
      glow: [1, 0, 0],
      ground: [0, 0, 0],
      light: false,
      peak: [1, 1, 1],
      tint: [0, 0, 1],
    })
    expect(colors.strands[0]).toEqual([1, 0, 0])
    expect(colors.strands[1][2]).toBeCloseTo(0.9)
    expect(colors.strands[2][1]).toBeCloseTo(0.6)
    expect(colors.dust[1]).toBeCloseTo(0.55)
  })
})
