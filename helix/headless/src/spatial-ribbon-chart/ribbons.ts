/**
 * A 3D ribbon chart's table read as ribbons, one for each series, and the
 * faces each is drawn with.
 *
 * Kept apart from the element because it is arithmetic a picture hides: a
 * ribbon whose faces are painted in the wrong order shows its back over its
 * front, and a value read under the wrong column bends a ribbon where the
 * data never did.
 */

import { type PagePoint, type Projection, pathData } from '@fusion.dev/helix-core'
import { type BarCell, type BarField, barsOf } from '../spatial-bar-chart/bars.js'
import type { FieldRow } from '../spatial-scatter-chart/field.js'
import { inBox } from '../spatial-scatter-chart/view.js'

/** How tall the box stands, as a share of its length across. */
const HEIGHT = 0.6

/** How deep a ribbon is, as a share of its place in depth, so neighbors stand apart. */
const THICKNESS = 0.45

/**
 * The table as a 3D ribbon chart reads it: as `Bar Chart` and `Line Chart`
 * read theirs, **each row a place across, named by its label, and each
 * numeric column a series**, drawn as a ribbon in its own depth.
 */
export type RibbonField = BarField

export type RibbonCell = BarCell

/**
 * Reads the table: each row a place across and each numeric column a
 * series, every series in a ribbon of its own, the first in front. **The box
 * is long across and shallow in depth**, a ribbon's place in depth a third
 * of the length across at most, so a long series reads as a line and not as
 * a wall.
 */
export const ribbonsOf = (rows: readonly FieldRow[], columns: readonly number[]): RibbonField => {
  const field = barsOf(rows, columns)
  const series = Math.max(field.series.length, 1)
  return {
    ...field,
    axes: {
      ...field.axes,
      extent: [1, HEIGHT, Math.min(1, Math.max(0.3, series * 0.22))],
      /* The places across run from the first to the last, as a line's do,
         with no half place either side of them. */
      x: {
        ...field.axes.x,
        range: [0, Math.max(field.categories.length - 1, 1)],
        rules: undefined,
      },
      /* Every series named along the depth, even one, which names its ribbon. */
      z: {
        ...field.axes.z,
        labels: field.series,
        ticks: field.series.map((_, at) => at),
      },
    },
  }
}

/** One face of a ribbon, as path data, and how far it turns from the light. */
export interface RibbonFace {
  d: string
  /** From 0, the series' color, as the top takes it, to about 0.3, shaded. */
  shade: number
}

/** A ribbon as the chart's own drawing paints it: its faces in the order to paint them, and where each reading stands. */
export interface DrawnRibbon {
  /** How near the camera the ribbon stands: the larger, the nearer. */
  depth: number
  faces: RibbonFace[]
  /** Every corner of the ribbon on the page, which a drawing with no box is framed around. */
  outline: PagePoint[]
  /** Each reading's place on the top of the ribbon, by its place in `field.cells`. */
  readings: Array<PagePoint & { index: number }>
  series: number
}

/**
 * Each series as a ribbon seen through `projection`, which the box's own
 * places go through as the box view's `on` does. **Painted so its faces
 * cover each other rightly from any side**: the side turned away is left
 * out, the top's pieces go back to front, and the side facing the reader
 * last. The ribbons themselves are painted back to front by the caller, in
 * `depth`.
 */
export const ribbonsDrawn = (field: RibbonField, projection: Projection): DrawnRibbon[] => {
  const [ex, ey, ez] = field.axes.extent
  const on = (x: number, y: number, z: number): PagePoint => projection.at(x * ex, -z * ez, y * ey)
  const across = field.categories.length
  const count = Math.max(field.series.length, 1)
  const half = (THICKNESS * 2) / count / 2
  const zero = inBox(field.axes.y, Math.max(field.axes.y.range[0], 0))
  /* Toward the camera, in the box's own directions: across, up, and in depth. */
  const [tx, ty, tz] = projection.toward
  const toward = { x: tx, y: tz, z: -ty }
  return field.series.map((_, series): DrawnRibbon => {
    const z = inBox(field.axes.z, series)
    const [near, far] = [z + half, z - half]
    const points: Array<{ index: number; value: number; x: number }> = []
    for (let at = 0; at < across; at++) {
      const index = at * field.series.length + series
      const value = field.cells[index]?.value
      if (value !== undefined) {
        points.push({ index, value: inBox(field.axes.y, value), x: inBox(field.axes.x, at) })
      }
    }
    const faces: RibbonFace[] = []
    /* The side facing the reader, front or back, drawn last, and the other left out. */
    const front = toward.z >= 0 ? near : far
    const curtain = (depth: number): string =>
      pathData([
        ...points.map((point) => on(point.x, point.value, depth)),
        ...[...points].reverse().map((point) => on(point.x, zero, depth)),
      ])
    /* The two ends, where they face the reader. */
    const first = points[0]
    const last = points.at(-1)
    const ends: RibbonFace[] = []
    if (first && last) {
      const end = toward.x >= 0 ? last : first
      ends.push({
        d: pathData([
          on(end.x, zero, near),
          on(end.x, end.value, near),
          on(end.x, end.value, far),
          on(end.x, zero, far),
        ]),
        shade: 0.22,
      })
    }
    /* The top, piece by piece between neighboring readings, back to front
       across, each shaded by how steeply it slopes. */
    const tops: RibbonFace[] = []
    for (let at = 0; at + 1 < points.length; at++) {
      const [a, b] = [
        points[at] as (typeof points)[number],
        points[at + 1] as (typeof points)[number],
      ]
      const rise = Math.abs(b.value - a.value) * ey
      const run = Math.abs(b.x - a.x) * ex || 1e-6
      tops.push({
        d: pathData([
          on(a.x, a.value, near),
          on(b.x, b.value, near),
          on(b.x, b.value, far),
          on(a.x, a.value, far),
        ]),
        shade: Math.min(0.3, (rise / Math.hypot(rise, run)) * 0.3),
      })
    }
    if (toward.x < 0) {
      tops.reverse()
    }
    faces.push(...ends, ...tops, { d: curtain(front), shade: 0.12 })
    const outline = points.flatMap((point) =>
      [near, far].flatMap((depth) => [on(point.x, point.value, depth), on(point.x, zero, depth)]),
    )
    return {
      depth: projection.depth(0, -z * ez),
      faces,
      outline,
      readings: points.map((point) => ({ index: point.index, ...on(point.x, point.value, front) })),
      series,
    }
  })
}
