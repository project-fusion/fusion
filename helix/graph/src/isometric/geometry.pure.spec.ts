import { describe, expect, test } from 'bun:test'
import { ACROSS, depthOrder, plate, project, snapToCells, solid, solidOf } from './geometry.js'

/** The corners of path data written `Mx yLx y…Z`, as numbers. */
const corners = (data: string): Array<[number, number]> =>
  data
    .replace(/^M|Z$/g, '')
    .split('L')
    .map((pair) => pair.split(' ').map(Number) as [number, number])

describe('the floor', () => {
  test('across runs down to the right, back runs up to the right, and height runs up', () => {
    expect(project(1, 0)).toEqual({ x: ACROSS, y: 0.5 })
    expect(project(0, 1)).toEqual({ x: ACROSS, y: -0.5 })
    expect(project(0, 0, 2)).toEqual({ x: 0, y: -2 })
  })

  test("each of the frame's shapes stands for a solid, a block where it gives none", () => {
    expect(solidOf('square')).toBe('block')
    expect(solidOf(undefined)).toBe('block')
    expect(solidOf('circle')).toBe('cylinder')
    expect(solidOf('ring')).toBe('cylinder')
    expect(solidOf('diamond')).toBe('pyramid')
  })
})

describe('a solid', () => {
  test('a block shows its two front sides and its top, the top last', () => {
    const block = solid('block', 0, 0, 1, 2)
    expect(block.faces.map((face) => face.light)).toEqual(['left', 'right', 'top'])
    /* The top is raised by the height above the floor's front corner. */
    const top = corners(block.faces[2]?.d ?? '')
    expect(Math.max(...top.map(([, y]) => y))).toBeCloseTo(0.5 - 2)
    expect(block.peak).toEqual(project(0, 0, 2))
  })

  test("a cylinder's front runs from the rim's leftmost point to its rightmost", () => {
    const cylinder = solid('cylinder', 0, 0, 1, 1)
    const front = corners(cylinder.faces[0]?.d ?? '')
    const xs = front.map(([x]) => x)
    /* The rim is a circle of half a cell, drawn as an ellipse as wide as a
       block's footprint on the page. */
    expect(Math.min(...xs)).toBeCloseTo(-0.5 * Math.SQRT2 * ACROSS, 3)
    expect(Math.max(...xs)).toBeCloseTo(0.5 * Math.SQRT2 * ACROSS, 3)
    /* Its lowest point is the rim's front on the floor. */
    expect(Math.max(...front.map(([, y]) => y))).toBeCloseTo(0.5 * Math.SQRT2 * 0.5, 3)
  })

  test('a pyramid is never lower than it is wide, so its front faces are the ones drawn', () => {
    const low = solid('pyramid', 0, 0, 1, 0.2)
    expect(low.peak.y).toBeCloseTo(-1)
    expect(low.faces.map((face) => face.light)).toEqual(['left', 'right'])
  })

  test('a flat solid has no height, and its sides are lines', () => {
    const flat = solid('block', 0, 0, 1, 0)
    const side = corners(flat.faces[0]?.d ?? '')
    expect(new Set(side.map((point) => point.join())).size).toBe(2)
  })
})

describe('the order of painting', () => {
  /* A note forward on the floor, toward the viewer, is painted after one
     further back, which it can cover. */
  test('back to front, and the taller first where two stand level', () => {
    const order = depthOrder([
      { height: 1, id: 'front', x: 2, y: 0 },
      { height: 1, id: 'back', x: 0, y: 2 },
      { height: 0.5, id: 'short', x: 1, y: 1 },
      { height: 2, id: 'tall', x: 0, y: 0 },
    ])
    expect(order.map((note) => note.id)).toEqual(['back', 'tall', 'short', 'front'])
  })
})

describe('a plate', () => {
  test('holds every note with a margin, and is written by on its front left edge', () => {
    const drawn = plate(
      [
        { x: 0, y: 0 },
        { x: 2, y: 1 },
      ],
      0.5,
    )
    const points = corners(drawn?.d ?? '')
    expect(points).toHaveLength(4)
    /* Path data is written to three places. */
    expect(points[3]?.[0]).toBeCloseTo(project(-0.5, -0.5).x, 3)
    expect(points[3]?.[1]).toBeCloseTo(project(-0.5, -0.5).y, 3)
    expect(drawn?.label).toEqual(project(-0.5, 0.5))
  })

  test('a group with no notes drawn has no plate', () => {
    expect(plate([], 1)).toBeUndefined()
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
