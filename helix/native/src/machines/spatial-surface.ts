/**
 * Spatial Surface Chart's drawing on a phone: each square of the grid
 * between its readings a face, painted back to front as core's
 * `surfacePicture` lays them, each in its height's color on the ramp and
 * shaded by how far it turns from the light, the contour lines across it
 * after it under `contours`, and the ring on the reading the reading rests
 * on. The web element draws the same faces from the same core in its own SVG.
 *
 * **Each face's and line's color is worked out here**, as the web's sheet
 * works it out with a relative color: the ramp's two ends mixed at the
 * face's level, the face's lightness taken down by its shade, its rule a
 * step lighter where it is dark and darker where it is light, and a contour
 * line its level's color a larger step from the face under it.
 */

import {
  boundsOf,
  boxView,
  contoursIn,
  type PagePoint,
  type SurfaceFace,
  type SurfaceField,
  surfaceOf,
  surfacePicture,
} from '@fusion.dev/helix-core/spatial'
import { lightnessOf, mix, movedLightness } from '../style/color'
import type { Theme } from '../theme/theme'
import { plottedOf } from './axis-chart'
import { within } from './spatial-bar'
import type { SpatialKind, SpatialPicture } from './spatial-chart'
import { circle } from './spatial-scatter'

/** The ring's radius around the reading, in the box's units, as the web draws it. */
const RING = 0.085

/** The chart's table as a grid of heights, and what it draws. */
interface Surface {
  readonly contours: boolean
  readonly emphasis: string
  readonly field: SurfaceField
  readonly noBox: boolean
}

/** The picture a phone draws, kept beside the box's picture so the marks read the faces. */
interface SurfaceDrawing extends SpatialPicture {
  readonly faces: readonly SurfaceFace[]
  /** The ramp's ends the element's hooks set, where they do. */
  readonly ends: { readonly high?: string | undefined; readonly low?: string | undefined }
  /** Where the box puts a place of the floor and a height, for the contour lines. */
  readonly on: (point: readonly [number, number, number]) => PagePoint
}

/** A hook's color, where the element sets one that reads as a color. */
const hookColor = (written: unknown): string | undefined =>
  typeof written === 'string' && lightnessOf(written) !== undefined ? written : undefined

/** `color` with its lightness moved by `(0.6 - l) * 1000`, held between `low` and `high`, as a rule's step is. */
const stepped = (color: string, low: number, high: number): string => {
  const lightness = lightnessOf(color) ?? 0.5
  return movedLightness(color, Math.min(high, Math.max(low, (0.6 - lightness) * 1000))) ?? color
}

/** The ramp's two ends: the hooks', or the theme's strong primary and a 35% mix of it into the sunken ground. */
const endsOf = (ends: SurfaceDrawing['ends'], theme: Theme) => {
  const strong = String(theme.tokens['color-primary-strong'] ?? '#000000')
  const sunken = String(theme.tokens['color-surface-sunken'] ?? '#ffffff')
  return { high: ends.high ?? strong, low: ends.low ?? mix(strong, 35, sunken) }
}

/** What one face is painted in: its ramp color, its fill, and its rule. */
const faceInk = (face: SurfaceFace, ramp: (level: number) => string) => {
  const color = ramp(face.level)
  const lit = movedLightness(color, -(lightnessOf(color) ?? 0) * face.shade) ?? color
  return { color, edge: stepped(lit, -0.08, 0.1), face: lit }
}

/** Each face back to front, and after it the contour lines that cross its square. */
const entriesOf = (model: Surface, picture: SurfaceDrawing, theme: Theme) => {
  const { high, low } = endsOf(picture.ends, theme)
  const ramp = (level: number) => mix(high, Math.min(100, Math.max(0, level * 100)), low)
  return picture.faces.flatMap((face) => {
    const ink = faceInk(face, ramp)
    const lines = model.contours
      ? contoursIn(model.field, face.square, picture.on).map((contour, at) => ({
          color: '',
          d: '',
          edge: '',
          face: '',
          ink: stepped(ramp(contour.level), -0.18, 0.22),
          key: `${face.square} ${at}`,
          line: contour.d,
        }))
      : []
    return [{ ...ink, d: face.d, ink: '', key: String(face.square), line: '' }, ...lines]
  })
}

/** The spatial surface chart, as the shared spatial chart draws it. */
export const spatialSurface: SpatialKind<Surface> = {
  among: () => [],
  count: (model) => model.field.cells.length,
  grid: (model) => Math.max(1, model.field.depths.length),
  /* A point on a face takes the face's nearest corner, front first, as the web's pointer does. */
  hit: (_model, picture, at) => {
    const drawn = picture as SurfaceDrawing
    for (let place = drawn.faces.length - 1; place >= 0; place -= 1) {
      const face = drawn.faces[place]
      const corners = (face?.corners ?? []).flatMap((index) => {
        const point = drawn.places[index]
        return point === undefined ? [] : [{ index, point }]
      })
      if (
        corners.length > 2 &&
        within(
          corners.map((one) => one.point),
          at,
        )
      ) {
        const near = corners.reduce((best, one) =>
          Math.hypot(one.point.x - at.x, one.point.y - at.y) <
          Math.hypot(best.point.x - at.x, best.point.y - at.y)
            ? one
            : best,
        )
        return near.index
      }
    }
    return -1
  },
  marks: (model, picture, at, { theme }) => {
    const active = picture.places[at]
    return {
      lists: { faces: entriesOf(model, picture as SurfaceDrawing, theme) },
      states: { ring: active === undefined ? '' : circle(active.x, active.y, RING) },
    }
  },
  model: (rows, options) => ({
    contours: options.contours === true,
    emphasis: String(options.emphasis ?? ''),
    field: surfaceOf(rows, plottedOf(rows)),
    noBox: options.noBox === true,
  }),
  open: (model, at, read) => {
    const cell = model.field.cells[at]
    if (cell === undefined || cell.value !== undefined) {
      return undefined
    }
    return String(read('open-label') ?? '')
      .replace('{across}', model.field.axes.x.name)
      .replace('{x}', String(cell.x))
      .replace('{depth}', model.field.axes.z.name)
      .replace('{z}', String(cell.z))
  },
  options: (read) => ({
    contours: read('contours') === true,
    emphasis: String(read('emphasis') ?? ''),
    noBox: read('no-box') === true,
  }),
  picture: (model, camera, words, lang, room) => {
    const view = boxView(model.field.axes, camera, [], model.noBox, words, lang)
    const drawn = surfacePicture(model.field, view)
    const places: PagePoint[] = []
    for (const place of drawn.places) {
      places[place.index] = { x: place.x, y: place.y }
    }
    return {
      ends: { high: hookColor(room.hooks.high), low: hookColor(room.hooks.low) },
      faces: drawn.faces,
      fits: model.noBox ? boundsOf(drawn.places, 0.1) : view.bounds,
      middle: view.on([0, 0, 0]),
      on: (point: readonly [number, number, number]) => view.on([point[0], point[1], point[2]]),
      places,
      view,
    }
  },
  rowOf: (model, at) => model.field.cells[at]?.row ?? -1,
  valued: (model, at) => model.field.cells[at]?.value !== undefined,
}
