/**
 * Spatial Scatter Chart's drawing on a phone: each row a point in the box,
 * across, up, and in depth, as core's `fieldOf` reads the table, painted back
 * to front as the camera sees them, each after its line down to the floor
 * under `drop-lines`, and the ring on the point the reading rests on. The web
 * element draws the same points from the same core in its own SVG.
 */

import {
  type BoxPoint,
  boundsOf,
  boxView,
  fieldOf,
  inBox,
  type PlotField,
  shortNumber,
} from '@fusion.dev/helix-core/spatial'
import { plottedOf } from './axis-chart'
import type { SpatialKind } from './spatial-chart'

/** A point's radius and its ring's, in the box's units, as the web draws them. */
const POINT = 0.045
const RING = 0.085

/** A circle as path data, which a repeat of paths draws. */
export const circle = (x: number, y: number, r: number): string =>
  `M${shortNumber(x - r)} ${shortNumber(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`

/** The chart's table as points and axes, where each stands in the box, and what it draws. */
interface Scatter {
  readonly bare: boolean
  readonly columns: readonly number[]
  readonly drops: boolean
  readonly field: PlotField
  readonly inside: readonly BoxPoint[]
}

/** The spatial scatter, as the shared spatial chart draws it. */
export const spatialScatter: SpatialKind<Scatter> = {
  among: (model) => model.columns,
  count: (model) => model.field.points.length,
  marks: (model, picture, at, colorOf) => {
    const painted = model.inside
      .map((point, index) => ({ depth: picture.view.depth(point), index, point }))
      .sort((one, other) => one.depth - other.depth)
    const marks = painted.map(({ index, point }) => {
      const place = picture.places[index] ?? { x: 0, y: 0 }
      const foot = picture.view.on([point[0], -1, point[2]])
      return {
        color: colorOf(model.field.points[index]?.groupIndex ?? 0),
        current: index === at,
        d: circle(place.x, place.y, POINT),
        key: String(index),
        line: model.drops
          ? `M${shortNumber(place.x)} ${shortNumber(place.y)}L${shortNumber(foot.x)} ${shortNumber(foot.y)}`
          : '',
      }
    })
    const active = picture.places[at]
    return {
      lists: { marks },
      states: { ring: active === undefined ? '' : circle(active.x, active.y, RING) },
    }
  },
  model: (rows, options) => {
    const columns = plottedOf(rows)
    const field = fieldOf(rows, columns, String(options.groupBy ?? ''))
    return {
      bare: options.noBox === true,
      columns,
      drops: options.dropLines === true,
      field,
      inside: field.points.map((point) => [
        inBox(field.axes.x, point.x),
        inBox(field.axes.y, point.y),
        inBox(field.axes.z, point.z),
      ]),
    }
  },
  options: (read) => ({
    dropLines: read('drop-lines') === true,
    groupBy: String(read('group-by') ?? ''),
    noBox: read('no-box') === true,
  }),
  picture: (model, camera, words, lang) => {
    const view = boxView(model.field.axes, camera, [], model.bare, words, lang)
    const places = model.inside.map((point) => view.on(point))
    return {
      fits: model.bare ? boundsOf(places, 0.1) : view.bounds,
      middle: view.on([0, 0, 0]),
      places,
      view,
    }
  },
  rowOf: (model, at) => model.field.points[at]?.row ?? -1,
}
