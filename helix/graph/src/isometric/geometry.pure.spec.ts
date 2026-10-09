import { describe, expect, test } from 'bun:test'
import { ISOMETRIC, layered, plate, projectionOf, snapToCells, solidOf } from './geometry.js'

/** The corners of path data written `Mx yLx y…Z`, as numbers. */
const corners = (data: string): Array<[number, number]> =>
  data
    .replace(/^M|Z$/g, '')
    .split('L')
    .map((pair) => pair.split(' ').map(Number) as [number, number])

/** The cosine of 30 degrees: how far across one floor step goes from the isometric camera. */
const ACROSS = Math.sqrt(3) / 2

const iso = projectionOf(ISOMETRIC)

describe('a shape', () => {
  test("each of the frame's shapes stands for a solid, a block where it gives none", () => {
    expect(solidOf('square')).toBe('block')
    expect(solidOf(undefined)).toBe('block')
    expect(solidOf('circle')).toBe('cylinder')
    expect(solidOf('ring')).toBe('cylinder')
    expect(solidOf('diamond')).toBe('pyramid')
  })
})

/** The six numbers of an SVG `matrix()`. */
const matrix = (transform: string | undefined): number[] =>
  (transform?.match(/-?[\d.]+/g) ?? []).map(Number)

describe('a plate', () => {
  test('holds every note with a margin, and its name runs along the edge nearest the camera', () => {
    const drawn = plate(
      iso,
      [
        { x: 0, y: 0 },
        { x: 2, y: 1 },
      ],
      0.5,
    )
    const points = corners(drawn?.d ?? '')
    expect(points).toHaveLength(4)
    expect(points[0]?.[0]).toBeCloseTo(iso.at(-0.5, -0.5).x, 2)
    expect(points[0]?.[1]).toBeCloseTo(iso.at(-0.5, -0.5).y, 2)
    /* Along the front left edge, down to the right on the page, from just inside its left end. */
    const [a, b, c, d, e, f] = matrix(drawn?.transform)
    expect(a).toBeCloseTo(ACROSS, 2)
    expect(b).toBeCloseTo(0.5, 2)
    expect(c).toBeCloseTo(-ACROSS, 2)
    expect(d).toBeCloseTo(0.5, 2)
    expect(e).toBeCloseTo(iso.at(-0.35, -0.38).x, 2)
    expect(f).toBeCloseTo(iso.at(-0.35, -0.38).y, 2)
  })

  test('from any turn, the name runs left to right and is not mirrored', () => {
    for (const turn of [0, 45, 135, 200, 225, 315]) {
      const drawn = plate(projectionOf({ tilt: ISOMETRIC.tilt, turn }), [{ x: 0, y: 0 }], 0.5)
      const [a = 0, b = 0, c = 0, d = 0] = matrix(drawn?.transform)
      expect(a).toBeGreaterThan(0)
      expect(a * d - b * c).toBeGreaterThan(0)
    }
  })

  test('a group with no notes drawn has no plate', () => {
    expect(plate(iso, [], 1)).toBeUndefined()
  })
})

describe('snapping to cells', () => {
  test('a note the page placed keeps its place, and one seeded beside it goes to the nearest free cell', () => {
    const placed = snapToCells(
      new Map([
        ['gateway', { x: 2, y: 0 }],
        ['orders', { x: 2.4, y: 0.3 }],
      ]),
      new Set(['orders']),
    )
    expect(placed.has('gateway')).toBe(false)
    const cell = placed.get('orders')
    expect(Math.max(Math.abs((cell?.x ?? 0) - 2), Math.abs(cell?.y ?? 0))).toBe(2)
  })

  test('notes seeded together are kept a cell apart, on whole cells', () => {
    const seeded = new Map(
      Array.from({ length: 9 }, (_, index) => [`n${index}`, { x: index * 0.1, y: 0 }]),
    )
    const placed = [...snapToCells(seeded, new Set(seeded.keys())).values()]
    expect(placed).toHaveLength(9)
    for (const one of placed) {
      expect(Number.isInteger(one.x) && Number.isInteger(one.y)).toBe(true)
      for (const other of placed) {
        if (one !== other) {
          expect(
            Math.max(Math.abs(one.x - other.x), Math.abs(one.y - other.y)),
          ).toBeGreaterThanOrEqual(2)
        }
      }
    }
  })
})

describe('a layered layout', () => {
  test('puts each note in the column of the longest run of links leading to it', () => {
    const placed = layered(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' },
        { source: 'a', target: 'c' },
      ],
    )
    expect(placed.get('a')?.x).toBe(0)
    expect(placed.get('b')?.x).toBe(2)
    expect(placed.get('c')?.x).toBe(4)
  })

  test('sorts a column by group, and centers it on the floor', () => {
    const placed = layered(
      [
        { group: 'Storage', id: 'lake' },
        { group: 'Compute', id: 'job' },
        { group: 'Storage', id: 'warehouse' },
      ],
      [],
    )
    const ys = ['job', 'lake', 'warehouse'].map((id) => placed.get(id)?.y)
    expect(ys).toEqual([2, 0, -2])
  })

  test('a loop is cut, and every note is still placed on a whole cell', () => {
    const placed = layered(
      [{ id: 'a' }, { id: 'b' }],
      [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'a' },
      ],
    )
    expect(placed.size).toBe(2)
    for (const at of placed.values()) {
      expect(Number.isInteger(at.x) && Number.isInteger(at.y)).toBe(true)
    }
  })
})
