import { describe, expect, test } from 'bun:test'
import { fieldFromInside, inflate } from './shape-field.js'
import { cuboid, onSphere, sphere, torus } from './solids.js'
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

  test('finds the part of the nearest triangle as a search of every triangle does', () => {
    /* Each face of the cube cut into a hundred squares, a part a face. */
    const corners: number[] = []
    const ofTriangle: number[] = []
    const faces: ((u: number, v: number) => number[])[] = [
      (u, v) => [u, v, 0],
      (u, v) => [u, v, 10],
      (u, v) => [u, 0, v],
      (u, v) => [u, 10, v],
      (u, v) => [0, u, v],
      (u, v) => [10, u, v],
    ]
    faces.forEach((face, part) => {
      for (let u = 0; u < 10; u++) {
        for (let v = 0; v < 10; v++) {
          corners.push(...face(u, v), ...face(u + 1, v), ...face(u + 1, v + 1))
          corners.push(...face(u, v), ...face(u + 1, v + 1), ...face(u, v + 1))
          ofTriangle.push(part, part)
        }
      }
    })
    const names = ['a', 'b', 'c', 'd', 'e', 'f']
    const named = shapeFromTriangles(corners, null, {
      regions: { names, ofTriangle },
      resolution: 40,
    })
    const shift = (named.width - 10) / 2
    const middles = Array.from({ length: corners.length / 9 }, (_, at) =>
      [0, 1, 2].map(
        (axis) =>
          ((corners[at * 9 + axis] as number) +
            (corners[at * 9 + 3 + axis] as number) +
            (corners[at * 9 + 6 + axis] as number)) /
          3,
      ),
    )
    let compared = 0
    for (let step = 0; step < 400; step++) {
      const point = [7, 13, 29].map((stride) => ((step * stride) % 97) / 9.7)
      const far = middles
        .map((middle, at) => ({
          at,
          far: Math.hypot(...middle.map((one, axis) => one - (point[axis] as number))),
        }))
        .sort((one, other) => one.far - other.far)
      const [first] = far
      if (!first) {
        continue
      }
      /* Only where the nearest triangle's part is plain: no other part's triangle about as near. */
      const rival = far.find((one) => ofTriangle[one.at] !== ofTriangle[first.at])
      if (!rival || rival.far - first.far < 1e-3) {
        continue
      }
      compared += 1
      expect(
        named.regionOf?.(
          (point[0] as number) + shift,
          /* The field's y points down, and the triangles' up. */
          shift + 10 - (point[1] as number),
          (point[2] as number) + shift,
        ),
      ).toBe(names[ofTriangle[first.at] as number])
    }
    expect(compared).toBeGreaterThan(300)
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

describe('parts carried through', () => {
  /* A flat square whose left half is `west` and right half `east`. */
  const flat = {
    ...fieldFromInside(() => true, { depth: 0, height: 100, width: 100 }),
    regionOf: (x: number) => (x < 50 ? 'west' : 'east'),
  }

  test('a puffed shape keeps the flat shape’s parts', () => {
    const puffed = inflate(flat, { depth: 20 })
    expect(puffed.regionOf?.(10, 50, 10)).toBe('west')
    expect(puffed.regionOf?.(90, 50, 10)).toBe('east')
  })

  test('a map wrapped round a ball keeps the map’s parts', () => {
    const globe = onSphere(flat, { radius: 50 })
    /* Longitude runs from the back round to the back, so the front's left is the map's west half. */
    expect(globe.regionOf?.(10, 50, 50)).toBe('west')
    expect(globe.regionOf?.(90, 50, 50)).toBe('east')
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
    const block = cuboid({ depth: 20, height: 20, round: 4, width: 20 })
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
