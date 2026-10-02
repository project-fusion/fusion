import { describe, expect, test } from 'bun:test'
import { sphere } from '../shapes/solids.js'
import { surfaceOf } from './surface.js'

describe('surfaceOf', () => {
  test('wraps a solid in triangles whose corners lie on its surface', () => {
    const ball = sphere({ radius: 30 })
    const { corners, triangles } = surfaceOf(ball)
    expect(triangles.length).toBeGreaterThan(300)
    expect(triangles.length % 3).toBe(0)
    for (let at = 0; at < corners.length; at += 3) {
      const out = Math.hypot(
        (corners[at] as number) - 30,
        (corners[at + 1] as number) - 30,
        (corners[at + 2] as number) - 30,
      )
      expect(Math.abs(out - 30)).toBeLessThan(1.5)
    }
  })

  test('wraps the surface a distance inside the solid, where asked', () => {
    const { corners } = surfaceOf(sphere({ radius: 30 }), -5)
    const out = Math.hypot(
      (corners[0] as number) - 30,
      (corners[1] as number) - 30,
      (corners[2] as number) - 30,
    )
    expect(out).toBeCloseTo(25, 0)
  })
})
