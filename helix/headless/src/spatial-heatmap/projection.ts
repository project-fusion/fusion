/**
 * Where each reading of a spatial heatmap stands, in the isometric projection, as SVG path data.
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
 * seen from the isometric camera. What is here is the heatmap's own: which way
 * its columns and rows run, its prisms, and the slab under them.
 */

import { ISOMETRIC, type PagePoint, pathData, projectionOf } from '@fusion.dev/helix-core'

/** How far across the page one step along either axis goes: the cosine of 30 degrees. */
export const ACROSS = Math.sqrt(3) / 2

/** A point on the page, in cells. */
export type Point = PagePoint

/** One reading drawn as a prism: three visible faces, as path data. */
export interface Prism {
  /** The reading's place among those drawn. */
  index: number
  /** The face toward the next row, drawn at the lower left. */
  left: string
  /** The middle of the top face, which is where the tooltip points. */
  peak: Point
  /** The face toward the next column, drawn at the lower right. */
  right: string
  /** The face the reading's tone is painted on. */
  top: string
}

/**
 * The slab the prisms stand on: its top, which is the floor, and its two
 * sides seen from the front, as path data.
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
  /** In the order they are painted, which is the order of the readings. */
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

const isometric = projectionOf(ISOMETRIC)

/**
 * A grid place and a height, on the page. Columns run down to the right and
 * rows down to the left, which is the floor's across and the way back from it.
 */
const at = (column: number, row: number, height: number): Point =>
  isometric.at(column, -row, height)

const path = pathData

/**
 * Every reading as a prism, filling down each column of `rows` and then
 * across, as the flat heatmap does.
 *
 * **Columns run down to the right and rows down to the left, so the order of
 * the readings is the order to paint them in.** A prism can only cover the
 * neighbors behind it, which are the one before it in its column and the one in
 * the same row of the column before, and both come earlier in the table. With
 * the axes the other way round, the newest column would stand at the back and
 * every tall reading in front of it would hide it.
 *
 * `footprint` is how much of its cell a prism covers along each edge, so `1`
 * leaves no gap between neighbors.
 */
export const reliefOf = (heights: readonly number[], rows: number, footprint: number): Relief => {
  const count = Math.max(1, Math.floor(rows) || 1)
  const inset = (1 - Math.min(1, Math.max(0, footprint))) / 2
  let left = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let top = Number.POSITIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY
  const prisms = heights.map((height, index): Prism => {
    const column = Math.floor(index / count)
    const row = index % count
    const near = column + inset
    const far = column + 1 - inset
    const start = row + inset
    const end = row + 1 - inset
    /* The four corners of the footprint, at the floor and at the top: the back
       one, the one toward the next column, the front one, and the one toward
       the next row. */
    const back = at(near, start, height)
    const across = at(far, start, height)
    const front = at(far, end, height)
    const down = at(near, end, height)
    const acrossFloor = at(far, start, 0)
    const frontFloor = at(far, end, 0)
    const downFloor = at(near, end, 0)
    left = Math.min(left, down.x)
    right = Math.max(right, across.x)
    top = Math.min(top, back.y)
    bottom = Math.max(bottom, frontFloor.y)
    return {
      index,
      left: path([down, front, frontFloor, downFloor]),
      peak: at(column + 0.5, row + 0.5, height),
      right: path([front, across, acrossFloor, frontFloor]),
      top: path([back, across, front, down]),
    }
  })
  if (prisms.length === 0) {
    return { base: undefined, box: { height: 0, width: 0, x: 0, y: 0 }, corners: undefined, prisms }
  }
  /* **The slab is the whole grid**, every column and the rows the first one
     fills, so a last column still filling stands on floor that waits for it. */
  const columns = Math.ceil(heights.length / count)
  const deep = Math.min(count, heights.length)
  const [first, last] = [-MARGIN, columns + MARGIN]
  const [near, far] = [-MARGIN, deep + MARGIN]
  const back = at(first, near, 0)
  const across = at(last, near, 0)
  const front = at(last, far, 0)
  const down = at(first, far, 0)
  const acrossFoot = at(last, near, -THICKNESS)
  const frontFoot = at(last, far, -THICKNESS)
  const downFoot = at(first, far, -THICKNESS)
  const base: Base = {
    left: path([down, front, frontFoot, downFoot]),
    right: path([front, across, acrossFoot, frontFoot]),
    top: path([back, across, front, down]),
  }
  left = Math.min(left, downFoot.x)
  right = Math.max(right, acrossFoot.x)
  top = Math.min(top, back.y)
  bottom = Math.max(bottom, frontFoot.y)
  return {
    base,
    box: { height: bottom - top, width: right - left, x: left, y: top },
    corners: { end: frontFoot, start: downFoot },
    prisms,
  }
}
