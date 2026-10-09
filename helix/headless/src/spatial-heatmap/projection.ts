/**
 * Where each reading of a spatial heatmap stands, seen from a camera that turns and tilts, as SVG path data.
 *
 * Kept apart from the element because it is arithmetic a picture hides: a face
 * drawn in the wrong order is covered by the prism it should cover, and a
 * height off by one reading's share still looks like a relief.
 *
 * **The units are cells.** A step along a column or a row is one cell, and a
 * prism's height is in the same unit, so the drawing scales as a whole through
 * the `viewBox` and a server can write it with no width to measure.
 *
 * **The projection is the one every spatial drawing shares**, `helix-core`'s,
 * seen from the isometric camera until the reader turns it. What is here is the
 * heatmap's own: which way its columns and rows run, its prisms, the slab
 * under them, and the order to paint them in.
 */

import {
  type Camera,
  depthOrder,
  ISOMETRIC,
  type PagePoint,
  type Projection,
  pathData,
  projectionOf,
  solid,
} from '@fusion.dev/helix-core'

/** How far across the page one step along either axis goes: the cosine of 30 degrees. */
export const ACROSS = Math.sqrt(3) / 2

/** A point on the page, in cells. */
export type Point = PagePoint

/**
 * One reading drawn as a prism: the faces the camera sees, as path data. From
 * the isometric camera, the lighter side is the one toward the next row,
 * drawn at the lower left, and the darker the one toward the next column.
 */
export interface Prism {
  /** The reading's place among those drawn. */
  index: number
  /** The side facing the light more, or `''` where the camera sees no side. */
  left: string
  /** The middle of the top face, which is where the tooltip points. */
  peak: Point
  /** The side facing it less, or `''` where the camera sees one side or none. */
  right: string
  /** The face the reading's tone is painted on. */
  top: string
}

/**
 * The slab the prisms stand on: its top, which is the floor, and the two
 * sides the camera sees, lighter first, as path data.
 */
export interface Base {
  left: string
  right: string
  top: string
}

/** Every prism, the slab under them, and the box they fit in. */
export interface Relief {
  /** The slab under the grid, or none where there is nothing to stand on it. */
  base: Base | undefined
  /** The box every face fits in, in cells: its left, top, width, and height. */
  box: { height: number; width: number; x: number; y: number }
  /**
   * The two ends of the front edge, at the foot of the slab: `start` at the
   * left corner, under the first column, and `end` at the bottom corner,
   * under the last. The strip's first and last labels stand there.
   */
  corners: { end: Point; start: Point } | undefined
  /** The middle of the grid, halfway up the tallest prism, which a drag turns the view round. */
  middle: Point
  /**
   * The prisms' places in `prisms`, back to front, the order to paint them
   * in. From the isometric camera it is the order of the readings.
   */
  order: number[]
  /** In the order of the readings. */
  prisms: Prism[]
}

/** How far the slab reaches past the grid on every side, in cells. */
export const MARGIN = 0.3

/** How thick the slab is, in cells. */
export const THICKNESS = 0.25

/**
 * Each reading's height, from zero, as a share of the highest reading times
 * `tallest`.
 *
 * **From zero, because the height is the value.** A height measured from the
 * lowest reading would make a day of 9 against a day of 10 look like nothing
 * against something. A blank reading, a zero, and a negative one stand at zero,
 * a prism having nothing below the floor to show.
 */
export const heightsOf = (
  values: readonly (number | undefined)[],
  highest: number,
  tallest: number,
): number[] =>
  values.map((value) =>
    highest > 0 && value !== undefined && value > 0
      ? (Math.min(value, highest) / highest) * tallest
      : 0,
  )

/** The highest positive reading, or zero where there is none. */
export const highestOf = (values: readonly (number | undefined)[]): number =>
  values.reduce<number>((high, value) => (value !== undefined && value > high ? value : high), 0)

/** The floor's place for a grid place: columns run along the floor's across, and rows the way back from it. */
const floor = (column: number, row: number): { x: number; y: number } => ({ x: column, y: -row })

/**
 * The sides of a box on the floor the camera sees, lighter first, and its
 * top, as path data. A box from `low` to `high` along the floor, between the
 * heights `bottom` and `top`.
 */
const boxFaces = (
  projection: Projection,
  low: { x: number; y: number },
  high: { x: number; y: number },
  bottom: number,
  top: number,
): { sides: string[]; top: string; points: Point[] } => {
  const at = (x: number, y: number, z: number): Point => projection.at(x, y, z)
  const corners: Array<[number, number]> = [
    [low.x, low.y],
    [high.x, low.y],
    [high.x, high.y],
    [low.x, high.y],
  ]
  const outward: Array<[number, number]> = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ]
  const sides: Array<{ d: string; light: number }> = []
  corners.forEach(([x, y], index) => {
    const [nx, ny] = outward[index] as [number, number]
    /* Toward the camera only, the one condition a side needs to be seen. */
    if (nx * projection.toward[0] + ny * projection.toward[1] <= 1e-6) {
      return
    }
    const [x2, y2] = corners[(index + 1) % 4] as [number, number]
    sides.push({
      d: pathData([at(x, y, top), at(x2, y2, top), at(x2, y2, bottom), at(x, y, bottom)]),
      /* How far it faces the right of the page: the light falls from the left. */
      light: nx * projection.across[0] + ny * projection.across[1],
    })
  })
  sides.sort((one, other) => one.light - other.light)
  const points = corners.flatMap(([x, y]) => [at(x, y, top), at(x, y, bottom)])
  return {
    points,
    sides: sides.map((side) => side.d),
    top: pathData(corners.map(([x, y]) => at(x, y, top))),
  }
}

/**
 * Every reading as a prism, filling down each column of `rows` and then
 * across, as the flat heatmap does, seen from `camera`.
 *
 * **Columns run down to the right and rows down to the left, from the
 * isometric camera, so there the order of the readings is the order to paint
 * them in.** A prism can only cover the neighbors behind it, which are the one
 * before it in its column and the one in the same row of the column before,
 * and both come earlier in the table. Turned, the order comes from how near
 * the camera each prism stands, which is `order`.
 *
 * `footprint` is how much of its cell a prism covers along each edge, so `1`
 * leaves no gap between neighbors.
 */
export const reliefOf = (
  heights: readonly number[],
  rows: number,
  footprint: number,
  camera: Camera = ISOMETRIC,
): Relief => {
  const projection = projectionOf(camera)
  const count = Math.max(1, Math.floor(rows) || 1)
  const width = Math.min(1, Math.max(0, footprint))
  const points: Point[] = []
  const places = heights.map((height, index) => {
    const column = Math.floor(index / count)
    const row = index % count
    return { height, index, ...floor(column + 0.5, row + 0.5) }
  })
  const prisms = places.map(({ height, index, x, y }): Prism => {
    const drawn = solid(projection, 'block', x, y, width, height)
    /* The sides first, lighter first, and the top last, as `solid` gives them. */
    const sides = drawn.faces.slice(0, -1).sort((one, other) => one.darken - other.darken)
    const half = width / 2
    for (const corner of [
      [x - half, y - half],
      [x + half, y - half],
      [x + half, y + half],
      [x - half, y + half],
    ] as const) {
      points.push(
        projection.at(corner[0], corner[1], 0),
        projection.at(corner[0], corner[1], height),
      )
    }
    return {
      index,
      left: sides[0]?.d ?? '',
      peak: drawn.peak,
      right: sides[1]?.d ?? '',
      top: drawn.faces.at(-1)?.d ?? '',
    }
  })
  if (prisms.length === 0) {
    return {
      base: undefined,
      box: { height: 0, width: 0, x: 0, y: 0 },
      corners: undefined,
      middle: { x: 0, y: 0 },
      order: [],
      prisms,
    }
  }
  /* **The slab is the whole grid**, every column and the rows the first one
     fills, so a last column still filling stands on floor that waits for it. */
  const columns = Math.ceil(heights.length / count)
  const deep = Math.min(count, heights.length)
  const [low, high] = [floor(-MARGIN, deep + MARGIN), floor(columns + MARGIN, -MARGIN)]
  const slab = boxFaces(projection, low, high, -THICKNESS, 0)
  const base: Base = { left: slab.sides[0] ?? '', right: slab.sides[1] ?? '', top: slab.top }
  points.push(...slab.points)
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const [left, top] = [Math.min(...xs), Math.min(...ys)]
  return {
    base,
    box: { height: Math.max(...ys) - top, width: Math.max(...xs) - left, x: left, y: top },
    /* Under the first column's last row, and under the last column's. */
    corners: {
      end: projection.at(columns + MARGIN, -(deep + MARGIN), -THICKNESS),
      start: projection.at(-MARGIN, -(deep + MARGIN), -THICKNESS),
    },
    middle: projection.at(columns / 2, -deep / 2, Math.max(0, ...heights) / 2),
    order: depthOrder(projection, places).map((place) => place.index),
    prisms,
  }
}
