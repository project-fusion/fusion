import { describe, expect, test } from 'bun:test'
import type { GraphPoint } from './seed.js'
import { surfaceWeb } from './surface-web.js'

/* Two flat sheets, one above the other: 8 apart through the air, nearer than
   one side of either is to the other, and apart across the surface. */
const sheets = (): GraphPoint[] => {
  const points: GraphPoint[] = []
  for (const z of [0, 8]) {
    for (let x = 0; x < 20; x++) {
      for (let y = 0; y < 20; y++) {
        points.push({ x: x * 2, y: y * 2, z })
      }
    }
  }
  return points
}

describe('surfaceWeb', () => {
  test('halves a surface across it: one sheet each, not a slice through both', () => {
    const points = sheets()
    const [one, other] = surfaceWeb(points).halve(
      points.map((_, at) => at),
      400,
    )
    const layers = (half: number[]): Set<number> => new Set(half.map((at) => points[at]?.z ?? 0))
    expect(layers(one).size).toBe(1)
    expect(layers(other).size).toBe(1)
  })

  test('halves a single sheet into two pieces side by side', () => {
    const points = sheets().filter((point) => point.z === 0)
    const [one, other] = surfaceWeb(points).halve(
      points.map((_, at) => at),
      200,
    )
    expect(one).toHaveLength(200)
    expect(other).toHaveLength(200)
    const middle = (half: number[]): GraphPoint => ({
      x: half.reduce((sum, at) => sum + (points[at]?.x ?? 0), 0) / half.length,
      y: half.reduce((sum, at) => sum + (points[at]?.y ?? 0), 0) / half.length,
    })
    const a = middle(one)
    const b = middle(other)
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(15)
  })
})
