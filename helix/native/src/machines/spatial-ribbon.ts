/**
 * Spatial Ribbon Chart's drawing on a phone: each series a ribbon in a depth
 * of its own, its top following the values and its face falling to zero, its
 * faces painted in the order core's `ribbonsDrawn` lays them and the ribbons
 * back to front, and the ring on the reading the reading rests on. The web
 * element draws the same ribbons from the same core in its own SVG.
 *
 * **Each face's color is worked out here**, as the web's sheet works it out
 * with a relative color: the series' color darkened by how far the face
 * turns from the light, its edge a step lighter where it is dark and darker
 * where it is light, as Spatial Bar Chart's faces are.
 */

import {
  boundsOf,
  boxView,
  type DrawnRibbon,
  type PagePoint,
  type RibbonField,
  ribbonsDrawn,
  ribbonsOf,
} from '@fusion.dev/helix-core/spatial'
import { plottedOf } from './axis-chart'
import { faceInk } from './spatial-bar'
import type { SpatialKind, SpatialPicture } from './spatial-chart'
import { circle } from './spatial-scatter'

/** How many series colors the theme has, after which they come round again. */
const SERIES = 24

/** The ring's radius around the reading, in the box's units, as the web draws it. */
const RING = 0.06

/** The chart's table as ribbons, and whether it draws its box. */
interface Ribbons {
  readonly emphasis: string
  readonly field: RibbonField
  readonly noBox: boolean
}

/** The picture a phone draws, kept beside the box's picture so the marks read the ribbons. */
interface RibbonsPicture extends SpatialPicture {
  /** The ribbons, back to front. */
  readonly ribbons: readonly DrawnRibbon[]
}

/** The spatial ribbon chart, as the shared spatial chart draws it. */
export const spatialRibbon: SpatialKind<Ribbons> = {
  among: () => [],
  columnOf: (model, at) => model.field.cells[at]?.column,
  count: (model) => model.field.cells.length,
  grid: (model) => Math.max(1, model.field.series.length),
  marks: (model, picture, at, { colorOf, theme }) => {
    const faces = (picture as RibbonsPicture).ribbons.flatMap((ribbon) => {
      const color = colorOf(ribbon.series % SERIES)
      return ribbon.faces.map((face, side) => {
        const ink = faceInk(color, face.shade, { emphasis: model.emphasis, lit: false, theme })
        return {
          color,
          d: face.d,
          edge: ink.edge,
          face: ink.face,
          key: `${ribbon.series} ${side}`,
        }
      })
    })
    const active = picture.places[at]
    return {
      lists: { faces },
      states: { ring: active === undefined ? '' : circle(active.x, active.y, RING) },
    }
  },
  model: (rows, options) => ({
    emphasis: String(options.emphasis ?? ''),
    field: ribbonsOf(rows, plottedOf(rows)),
    noBox: options.noBox === true,
  }),
  open: (model, at, read) => {
    const cell = model.field.cells[at]
    if (cell === undefined || cell.value !== undefined) {
      return undefined
    }
    return String(read('open-label') ?? '')
      .replace('{place}', cell.label)
      .replace('{series}', model.field.series[cell.depth] ?? '')
  },
  options: (read) => ({
    emphasis: String(read('emphasis') ?? ''),
    noBox: read('no-box') === true,
  }),
  picture: (model, camera, words, lang) => {
    const view = boxView(model.field.axes, camera, [], model.noBox, words, lang)
    const ribbons = ribbonsDrawn(model.field, view.projection).sort(
      (one, other) => one.depth - other.depth,
    )
    const places: PagePoint[] = []
    for (const reading of ribbons.flatMap((ribbon) => ribbon.readings)) {
      places[reading.index] = { x: reading.x, y: reading.y }
    }
    return {
      fits: model.noBox
        ? boundsOf(
            ribbons.flatMap((ribbon) => ribbon.outline),
            0.1,
          )
        : view.bounds,
      middle: view.on([0, 0, 0]),
      places,
      ribbons,
      view,
    }
  },
  rowOf: (model, at) => model.field.cells[at]?.row ?? -1,
  valued: (model, at) => model.field.cells[at]?.value !== undefined,
}
