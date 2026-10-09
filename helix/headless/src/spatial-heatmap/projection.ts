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
  hullOf,
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
   * The two ends of the front edge, the long edge at the foot of the slab
   * nearer the reader: `start` under the first column, and `end` under the
   * last. From the isometric camera they are the left corner and the bottom
   * one. The strip's first and last labels stand there.
   */
  corners: { end: Point; start: Point } | undefined
  /** The middle of the grid, halfway up the tallest prism, which a drag turns the view round. */
  middle: Point
  /** The corners of the box the slab and the tallest prism fill, which every face stands inside. */
  outline: Point[]
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
      outline: [],
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
  const tallest = Math.max(0, ...heights)
  /* The long edge nearer the reader: under the last row from the isometric
     camera, and under the first once the strip is turned round. */
  const [lastRow, firstRow] = [-(deep + MARGIN), MARGIN]
  const front =
    projection.depth(columns / 2, lastRow) >= projection.depth(columns / 2, firstRow)
      ? lastRow
      : firstRow
  const outline: Point[] = []
  for (const x of [-MARGIN, columns + MARGIN]) {
    for (const y of [lastRow, firstRow]) {
      outline.push(projection.at(x, y, -THICKNESS), projection.at(x, y, tallest))
    }
  }
  return {
    base,
    box: { height: Math.max(...ys) - top, width: Math.max(...xs) - left, x: left, y: top },
    corners: {
      end: projection.at(columns + MARGIN, front, -THICKNESS),
      start: projection.at(-MARGIN, front, -THICKNESS),
    },
    middle: projection.at(columns / 2, -deep / 2, tallest / 2),
    order: depthOrder(projection, places).map((place) => place.index),
    outline,
    prisms,
  }
}

/** A label's size on the page. */
export interface LabelSize {
  height: number
  width: number
}

/**
 * The lowest the outline `hull` reaches on the page between `left` and
 * `right`, or `-Infinity` where it does not reach that far across.
 */
const lowestOver = (hull: readonly Point[], left: number, right: number): number => {
  let lowest = Number.NEGATIVE_INFINITY
  hull.forEach((from, index) => {
    const to = hull[(index + 1) % hull.length] as Point
    const [a, b] = from.x <= to.x ? [from, to] : [to, from]
    if (b.x < left || a.x > right) {
      return
    }
    const at = (x: number): number =>
      b.x === a.x ? Math.max(a.y, b.y) : a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y)
    lowest = Math.max(lowest, at(Math.max(a.x, left)), at(Math.min(b.x, right)))
  })
  return lowest
}

/**
 * Where the strip's first and last labels stand, as the top left of each,
 * on a page where the drawing's `outline` and its front edge's `corners`
 * stand where given and the labels may run from 0 to `span` across.
 *
 * **Under its corner, and clear of the drawing.** A label runs away from the
 * front edge, so the edge does not fall across it, and stays inside the
 * span, which can move it under the edge; it then stands as far down as the
 * outline reaches over it, and no lower than `lowest`, where a renderer's
 * drawing is cut. Where the two would meet, as when the strip is seen end on,
 * the last stands under the first, or beside it where there is no room below.
 */
export const labelPlaces = (
  outline: readonly Point[],
  corners: { end: Point; start: Point },
  sizes: { end: LabelSize; start: LabelSize },
  span: number,
  gap: number,
  lowest = Number.POSITIVE_INFINITY,
): { end: Point; start: Point } => {
  const hull = hullOf(outline)
  const across = (left: number, size: LabelSize): number =>
    Math.max(0, Math.min(left, span - size.width))
  const place = (at: Point, toward: Point, size: LabelSize): Point => {
    const away = Math.sign(toward.x - at.x)
    const wanted = away > 0 ? at.x - size.width : away < 0 ? at.x : at.x - size.width / 2
    const left = across(wanted, size)
    const top = Math.max(at.y, lowestOver(hull, left, left + size.width)) + gap
    return { x: left, y: Math.min(top, lowest) }
  }
  const start = place(corners.start, corners.end, sizes.start)
  const end = place(corners.end, corners.start, sizes.end)
  const meet =
    start.x < end.x + sizes.end.width &&
    end.x < start.x + sizes.start.width &&
    start.y < end.y + sizes.end.height &&
    end.y < start.y + sizes.start.height
  if (!meet) {
    return { end, start }
  }
  const under = start.y + sizes.start.height + gap / 2
  if (under <= lowest) {
    return { end: { ...end, y: under }, start }
  }
  /* Beside the first, on the side the last corner is. */
  const right = corners.end.x >= corners.start.x
  const beside = right ? start.x + sizes.start.width + gap : start.x - sizes.end.width - gap
  return { end: { x: across(beside, sizes.end), y: start.y }, start }
}
