import { describe, expect, test } from 'bun:test'
import { depthOrder, ISOMETRIC, projectionOf, solid } from './projection.js'

/** The corners of path data written `Mx yLx y…Z`, as numbers. */
const corners = (data: string): Array<[number, number]> =>
  data
    .replace(/^M|Z$/g, '')
    .split('L')
    .map((pair) => pair.split(' ').map(Number) as [number, number])

/** The cosine of 30 degrees: how far across one floor step goes from the isometric camera. */
const ACROSS = Math.sqrt(3) / 2

const iso = projectionOf(ISOMETRIC)

describe('the isometric camera', () => {
  test('across runs down to the right, back runs up to the right, and height runs up, each the same length', () => {
    expect(iso.at(1, 0).x).toBeCloseTo(ACROSS)
    expect(iso.at(1, 0).y).toBeCloseTo(0.5)
    expect(iso.at(0, 1).x).toBeCloseTo(ACROSS)
    expect(iso.at(0, 1).y).toBeCloseTo(-0.5)
    expect(iso.at(0, 0, 2).x).toBeCloseTo(0)
    expect(iso.at(0, 0, 2).y).toBeCloseTo(-2)
  })

  test('a point on the page is read back as the place on the floor drawn there', () => {
    const back = iso.floorAt(iso.at(3, -2))
    expect(back.x).toBeCloseTo(3)
    expect(back.y).toBeCloseTo(-2)
  })
})

/** How dark each face is, to two places. */
const darkness = (faces: readonly { darken: number }[]): number[] =>
  faces.map((face) => Math.round(face.darken * 100) / 100)

describe('a solid', () => {
  test('a block shows two sides and its top, the left side lighter than the right and the top last', () => {
    const block = solid(iso, 'block', 0, 0, 1, 2)
    expect(darkness(block.faces)).toEqual([0.2, 0.36, 0])
    /* The top is raised by the height above the floor's front corner. */
    const top = corners(block.faces[2]?.d ?? '')
    expect(Math.max(...top.map(([, y]) => y))).toBeCloseTo(0.5 - 2)
    expect(block.peak.y).toBeCloseTo(-2)
  })

  test("a cylinder's front runs from the rim's leftmost point to its rightmost", () => {
    const cylinder = solid(iso, 'cylinder', 0, 0, 1, 1)
    const front = corners(cylinder.faces[0]?.d ?? '')
    const xs = front.map(([x]) => x)
    /* The rim is a circle of half a cell, drawn as an ellipse as wide as a
       block's footprint on the page. */
    expect(Math.min(...xs)).toBeCloseTo(-0.5 * Math.SQRT2 * ACROSS, 3)
    expect(Math.max(...xs)).toBeCloseTo(0.5 * Math.SQRT2 * ACROSS, 3)
    /* Its lowest point is the rim's front on the floor. */
    expect(Math.max(...front.map(([, y]) => y))).toBeCloseTo(0.5 * Math.SQRT2 * 0.5, 3)
  })

  test('a pyramid is never lower than it is wide, and shows the two faces toward the camera', () => {
    const low = solid(iso, 'pyramid', 0, 0, 1, 0.2)
    expect(low.peak.y).toBeCloseTo(-1)
    expect(low.faces).toHaveLength(2)
  })

  test('a flat block shows its top alone', () => {
    expect(solid(iso, 'block', 0, 0, 1, 0).faces).toHaveLength(1)
  })

  test("a solid's name goes above its crown, the highest point of its outline", () => {
    const block = solid(iso, 'block', 0, 0, 1, 1)
    const outline = corners(block.outline)
    expect(block.crown).toBeCloseTo(Math.min(...outline.map(([, y]) => y)), 2)
    /* The top's back corner, half a cell back, is higher than the middle of the top. */
    expect(block.crown).toBeLessThan(block.peak.y)
  })
})

describe('a turned camera', () => {
  /**
   * **Turned half round, the camera sees the other two sides**, and they
   * are lit as the page lights them: the one on the left of the page is the
   * lighter, whichever side of the block it is.
   */
  test('from the back right, a block shows its back two sides, lit the same way on the page', () => {
    const back = projectionOf({ tilt: ISOMETRIC.tilt, turn: 225 })
    const block = solid(back, 'block', 0, 0, 1, 1)
    expect(darkness(block.faces).sort()).toEqual([0, 0.2, 0.36])
    const front = solid(iso, 'block', 0, 0, 1, 1)
    expect(block.faces.map((face) => face.d)).not.toEqual(front.faces.map((face) => face.d))
  })

  test('a quarter turn moves which note stands in front', () => {
    const notes = [
      { height: 1, id: 'a', x: 2, y: 0 },
      { height: 1, id: 'b', x: 0, y: -2 },
    ]
    const ids = (turn: number) =>
      depthOrder(projectionOf({ tilt: ISOMETRIC.tilt, turn }), notes).map((note) => note.id)
    expect(ids(0)).toEqual(['a', 'b'])
    expect(ids(90)).toEqual(['b', 'a'])
  })

  test('seen from straight above, a block is its top and a cylinder its rim', () => {
    const plan = projectionOf({ tilt: 90, turn: 45 })
    expect(solid(plan, 'block', 0, 0, 1, 2).faces).toHaveLength(1)
    expect(solid(plan, 'cylinder', 0, 0, 1, 2).faces).toHaveLength(1)
  })

  test('a tilt below the lowest is held at the lowest', () => {
    const low = projectionOf({ tilt: 0, turn: 45 }).at(0, 1)
    const lowest = projectionOf({ tilt: 15, turn: 45 }).at(0, 1)
    expect(low).toEqual(lowest)
  })
})

describe('the order of painting', () => {
  /* A note forward on the floor, toward the viewer, is painted after one
     further back, which it can cover. */
  test('back to front, and the taller first where two stand level', () => {
    const order = depthOrder(iso, [
      { height: 1, id: 'front', x: 2, y: 0 },
      { height: 1, id: 'back', x: 0, y: 2 },
      { height: 0.5, id: 'short', x: 1, y: 1 },
      { height: 2, id: 'tall', x: 0, y: 0 },
    ])
    expect(order.map((note) => note.id)).toEqual(['back', 'tall', 'short', 'front'])
  })
})
