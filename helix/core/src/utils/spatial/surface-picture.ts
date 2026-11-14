/**
 * A 3D surface as a drawing lays it out: each square of the grid between its
 * readings a face, painted back to front, with how high it stands and how
 * far it turns from the light, the contour lines that cross it, and where
 * each reading stands on the page.
 *
 * Kept with the grid because both drawings read it: the web element draws
 * these faces in its own SVG, and a phone in react-native-svg, so a face
 * stands at one place and takes one shade in either.
 */

import { type PagePoint, shortNumber } from '../projection/projection.js'
import { type BoxPoint, type BoxView, inBox, shape } from './box.js'
import { levelOf, type SurfaceField } from './surface.js'

/**
 * Where the light comes from, in the box: from the left, above, and a little
 * in front, so a slope facing the upper left of the page reads lightest.
 */
const LIGHT: BoxPoint = (() => {
  const [x, y, z] = [-0.45, 1, 0.35]
  const length = Math.hypot(x, y, z)
  return [x / length, y / length, z / length]
})()

/** How much a face turned fully from the light is darkened, as a share of lightness. */
const SHADE = 0.3

/** One square of the surface as the drawing paints it. */
export interface SurfaceFace {
  /** The readings at its corners, by their places in `field.cells`. */
  corners: number[]
  /** Its outline on the page, as path data. */
  d: string
  /** How near the camera it stands: the larger, the nearer. */
  depth: number
  /** How high it stands between the lowest reading and the highest, from 0 to 1: its corners' average. */
  level: number
  /** How far it turns from the light, as a share of lightness, from 0 to `SHADE`. */
  shade: number
  /** The square of the grid it fills, by its first corner's place in `field.cells`. */
  square: number
}

/** A contour line's pieces across one square, as path data, and how high it runs, from 0 to 1. */
export interface SurfaceContour {
  d: string
  level: number
}

/** The surface seen through one view: its faces back to front, and where each reading stands. */
export interface SurfacePicture {
  faces: SurfaceFace[]
  /** Each reading's place on the page, by its place in `field.cells`. */
  places: Array<PagePoint & { index: number }>
}

/**
 * How far a face turns from the light, as a share of lightness to take from
 * its color: none for a face toward the light, and `SHADE` for one turned
 * fully away. Its upward side counts, so a face seen from below is shaded as
 * the same slope seen from above.
 */
export const shadeOf = (points: readonly BoxPoint[]): number => {
  const [a, b, c] = points as [BoxPoint, BoxPoint, BoxPoint]
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]] as const
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]] as const
  let n: [number, number, number] = [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ]
  if (n[1] < 0) {
    n = [-n[0], -n[1], -n[2]]
  }
  const length = Math.hypot(...n) || 1
  const lit = (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]) / length
  return Math.min(SHADE, Math.max(0, (1 - lit) * SHADE))
}

/** Each reading in the box's own places, or undefined where the grid has none. */
const boxedOf = (field: SurfaceField): Array<BoxPoint | undefined> =>
  field.cells.map((cell): BoxPoint | undefined =>
    cell.value === undefined
      ? undefined
      : [inBox(field.axes.x, cell.x), inBox(field.axes.y, cell.value), inBox(field.axes.z, cell.z)],
  )

/** The face of one square of the grid, or undefined where fewer than three of its corners hold a reading. */
const faceAt = (
  field: SurfaceField,
  boxed: ReadonlyArray<BoxPoint | undefined>,
  view: BoxView,
  here: number,
): SurfaceFace | undefined => {
  const depths = field.depths.length
  const corners = [here, here + depths, here + depths + 1, here + 1].filter(
    (index) => boxed[index] !== undefined,
  )
  if (corners.length < 3) {
    return undefined
  }
  const points = corners.map((index) => boxed[index] as BoxPoint)
  const level =
    corners.reduce((sum, index) => {
      const cell = field.cells[index]
      return sum + (cell === undefined ? 0 : (levelOf(field, cell) ?? 0))
    }, 0) / corners.length
  return {
    corners,
    d: shape(points.map((point) => view.on(point))),
    depth: points.reduce((sum, point) => sum + view.depth(point), 0) / points.length,
    level,
    shade: shadeOf(points),
    square: here,
  }
}

/**
 * The surface seen through `view`: each square of the grid between four
 * readings a face, painted back to front, colored by its height and shaded by
 * which way it faces. A place with no reading leaves a hole, and a square
 * missing one corner is the triangle of the other three.
 */
export const surfacePicture = (field: SurfaceField, view: BoxView): SurfacePicture => {
  const depths = field.depths.length
  const boxed = boxedOf(field)
  const places = boxed.flatMap((box, index) => (box ? [{ index, ...view.on(box) }] : []))
  const faces: SurfaceFace[] = []
  for (let across = 0; across + 1 < field.acrosses.length; across++) {
    for (let depth = 0; depth + 1 < depths; depth++) {
      const face = faceAt(field, boxed, view, across * depths + depth)
      if (face !== undefined) {
        faces.push(face)
      }
    }
  }
  faces.sort((one, other) => one.depth - other.depth)
  return { faces, places }
}

/**
 * The contour lines that cross one square of the grid, at their heights, as
 * one path for each, which a drawing paints straight after the square's face
 * so the faces in front of it cover them as they cover the face.
 */
export const contoursIn = (
  field: SurfaceField,
  square: number,
  on: (point: BoxPoint) => PagePoint,
): SurfaceContour[] => {
  const { highest, lowest } = field
  return field.contours.flatMap((contour) => {
    const pieces = contour.segments.filter((_, at) => contour.squares[at] === square)
    if (pieces.length === 0) {
      return []
    }
    const height = inBox(field.axes.y, contour.level)
    const d = pieces
      .map(([from, to]) => {
        const a = on([inBox(field.axes.x, from[0]), height, inBox(field.axes.z, from[1])])
        const b = on([inBox(field.axes.x, to[0]), height, inBox(field.axes.z, to[1])])
        return `M${shortNumber(a.x)} ${shortNumber(a.y)}L${shortNumber(b.x)} ${shortNumber(b.y)}`
      })
      .join('')
    const level = highest === lowest ? 0.5 : (contour.level - lowest) / (highest - lowest)
    return [{ d, level }]
  })
}
