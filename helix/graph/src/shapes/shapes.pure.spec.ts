import { describe, expect, test } from 'bun:test'
import { fieldFromInside } from '../connect-graph/shape-field.js'
import { box, onSphere, sphere, torus } from './solids.js'
import { shapeFromTriangles } from './triangles.js'

/* A cube from 0 to 10 on each axis: twelve triangles, two to a face. */
const cube = (): number[] => {
  const corner = (x: number, y: number, z: number): number[] => [x * 10, y * 10, z * 10]
  const quad = (a: number[], b: number[], c: number[], d: number[]): number[] => [
    ...a,
    ...b,
    ...c,
    ...a,
    ...c,
    ...d,
  ]
  return [
    ...quad(corner(0, 0, 0), corner(1, 0, 0), corner(1, 1, 0), corner(0, 1, 0)),
    ...quad(corner(0, 0, 1), corner(0, 1, 1), corner(1, 1, 1), corner(1, 0, 1)),
    ...quad(corner(0, 0, 0), corner(0, 1, 0), corner(0, 1, 1), corner(0, 0, 1)),
    ...quad(corner(1, 0, 0), corner(1, 0, 1), corner(1, 1, 1), corner(1, 1, 0)),
    ...quad(corner(0, 0, 0), corner(0, 0, 1), corner(1, 0, 1), corner(1, 0, 0)),
    ...quad(corner(0, 1, 0), corner(1, 1, 0), corner(1, 1, 1), corner(0, 1, 1)),
  ]
}

describe('shapeFromTriangles', () => {
  const field = shapeFromTriangles(cube(), null, { resolution: 40 })
  const middle = { x: field.width / 2, y: field.height / 2, z: field.depth / 2 }

  test('reads a closed surface as a solid, in a box a cell larger on every side', () => {
    expect(field.width).toBeGreaterThan(10)
    expect(field.width).toBeLessThan(12)
    expect(field.distance(middle.x, middle.y, middle.z)).toBeCloseTo(-5, 0)
  })

  test('says which named part a point is in: the part of the nearest triangle', () => {
    /* The cube's twelve triangles: the two on its near face, at z 0, named `low`, and the rest `high`. */
    const named = shapeFromTriangles(cube(), null, {
      regions: {
        names: ['low', 'high'],
        ofTriangle: Array.from({ length: 12 }, (_, at) => (at < 2 ? 0 : 1)),
      },
      resolution: 40,
    })
    expect(named.regionOf?.(named.width / 2, named.height / 2, 0.6)).toBe('low')
    expect(named.regionOf?.(named.width / 2, named.height / 2, named.depth - 0.6)).toBe('high')
    expect(field.regionOf).toBeUndefined()
  })

  test('keeps the surface it was read from, to be drawn as it is', () => {
    expect(field.mesh?.triangles).toHaveLength(36)
    expect(field.mesh?.corners).toHaveLength(36 * 3)
  })

  test('is outside past each face', () => {
    expect(field.distance(middle.x, middle.y, 0.1)).toBeGreaterThan(0)
    expect(field.distance(0.1, middle.y, middle.z)).toBeGreaterThan(0)
    expect(field.distance(middle.x, 0.1, middle.z)).toBeGreaterThan(0)
  })

  test('reads the same solid from corners shared by an index', () => {
    const flat = cube()
    const corners: number[] = []
    const index: number[] = []
    const seen = new Map<string, number>()
    for (let at = 0; at < flat.length; at += 3) {
      const key = flat.slice(at, at + 3).join(',')
      if (!seen.has(key)) {
        seen.set(key, seen.size)
        corners.push(...flat.slice(at, at + 3))
      }
      index.push(seen.get(key) as number)
    }
    const indexed = shapeFromTriangles(corners, index, { resolution: 40 })
    expect(indexed.distance(middle.x, middle.y, middle.z)).toBeCloseTo(
      field.distance(middle.x, middle.y, middle.z),
      3,
    )
  })
})

describe('solids', () => {
  test('a sphere is measured exactly', () => {
    const ball = sphere({ radius: 10 })
    expect(ball.distance(10, 10, 10)).toBe(-10)
    expect(ball.distance(10, 10, 25)).toBe(5)
  })

  test('a torus is hollow in its middle', () => {
    const ring = torus({ radius: 20, tube: 5 })
    const reach = 25
    expect(ring.distance(reach, reach, 5)).toBeGreaterThan(0)
    expect(ring.distance(reach + 20, reach, 5)).toBe(-5)
  })

  test('a rounded box is inside at its middle and outside past its corners', () => {
    const block = box({ depth: 20, height: 20, round: 4, width: 20 })
    expect(block.distance(10, 10, 10)).toBe(-10)
    expect(block.distance(0.5, 0.5, 0.5)).toBeGreaterThan(0)
  })

  test('a flat map wrapped round a ball is a shell only where the map is', () => {
    /* A map whose left half is land. */
    const map = fieldFromInside((x) => x < 50, { height: 50, width: 100 }, 64)
    const globe = onSphere(map, { radius: 10, thickness: 2 })
    /* On the surface at the equator, a quarter turn either side of the front. */
    const at = (turn: number): number =>
      globe.distance(10 + Math.sin(turn) * 9, 10, 10 + Math.cos(turn) * 9)
    expect(at(-Math.PI / 2)).toBeLessThan(0)
    expect(at(Math.PI / 2)).toBeGreaterThan(0)
    /* Not inside the ball, where there is no map. */
    expect(globe.distance(10, 10, 10)).toBeGreaterThan(0)
  })
})
