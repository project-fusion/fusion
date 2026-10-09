/**
 * A 3D surface's table read as a grid of heights.
 *
 * Kept apart from the element because it is arithmetic a picture hides: a
 * reading put in the wrong cell bends the surface in a place the data never
 * did, and a missing reading drawn as zero digs a pit that is not there.
 */

import { ticks } from '@fusion.dev/helix-core'
import { type FieldRow, niceRange, type PlotAxis } from '../spatial-scatter-chart/field.js'

/** One place on the grid: where it stands across and in depth, and its reading, where the table has one. */
export interface SurfaceCell {
  /** The row's own label, where the table has a reading here. */
  label?: string | undefined
  /** The row it was read from, counting from zero. */
  row?: number | undefined
  /** The height, where the table has a reading here. */
  value?: number | undefined
  /** Across and in depth, in the table's own numbers. */
  x: number
  z: number
}

/** The table as a 3D surface reads it. */
export interface SurfaceField {
  /** Across, up (the height), and in depth. */
  axes: { x: PlotAxis; y: PlotAxis; z: PlotAxis }
  /**
   * Every place on the grid, across first: the cell `across` places along
   * and `depth` places back is at `across * depths.length + depth`.
   */
  cells: SurfaceCell[]
  /** The distinct places across, lowest first. */
  acrosses: number[]
  /** The distinct places in depth, lowest first. */
  depths: number[]
  /** How many cells hold a reading. */
  readings: number
  /** The lowest and the highest reading, which every level is measured between. */
  lowest: number
  highest: number
  /** The contour lines at each tick of the height inside the readings, which `contours` draws on the floor. */
  contours: Contour[]
}

/**
 * Reads the table: **the first numeric column is across, the second is in
 * depth, and the third is the height**, one reading per row. The grid takes
 * every distinct place across and in depth, so a place the table has no
 * reading for is a cell with no value, which the surface leaves open. A
 * later row for a place already read replaces it.
 */
export const surfaceOf = (rows: readonly FieldRow[], columns: readonly number[]): SurfaceField => {
  const [xAt, zAt, yAt] = columns
  const nameOf = (column: number | undefined): string =>
    column === undefined ? '' : (rows.find((row) => row.cells[column])?.cells[column]?.name ?? '')
  const read: Array<{ label: string; row: number; value: number; x: number; z: number }> = []
  rows.forEach((row, at) => {
    const value = (column: number | undefined): number | undefined =>
      column === undefined ? undefined : row.cells[column]?.value
    const [x, z, y] = [value(xAt), value(zAt), value(yAt)]
    if (Number.isFinite(x) && Number.isFinite(z) && Number.isFinite(y)) {
      read.push({ label: row.label, row: at, value: y as number, x: x as number, z: z as number })
    }
  })
  const distinct = (values: number[]): number[] => [...new Set(values)].sort((a, b) => a - b)
  const acrosses = distinct(read.map((one) => one.x))
  const depths = distinct(read.map((one) => one.z))
  const cells: SurfaceCell[] = acrosses.flatMap((x) => depths.map((z) => ({ x, z })))
  for (const one of read) {
    const at = acrosses.indexOf(one.x) * depths.length + depths.indexOf(one.z)
    cells[at] = { label: one.label, row: one.row, value: one.value, x: one.x, z: one.z }
  }
  /* **The floor's two axes run from the grid's first place to its last**, so
     the surface reaches every edge of the box, and the height's is widened to
     round numbers, as a chart's value axis is. A floor of one place is
     widened as the height is, since it has no length of its own. */
  const axis = (column: number | undefined, values: number[], exact: boolean): PlotAxis => {
    const [low, high] = [Math.min(...values), Math.max(...values)]
    const range: [number, number] = exact && low < high ? [low, high] : niceRange(low, high)
    return { name: nameOf(column), range, ticks: ticks(range) }
  }
  const field: SurfaceField = {
    acrosses,
    axes: {
      x: axis(xAt, acrosses, true),
      y: axis(
        yAt,
        read.map((one) => one.value),
        false,
      ),
      z: axis(zAt, depths, true),
    },
    cells,
    contours: [],
    depths,
    highest: read.length > 0 ? Math.max(...read.map((one) => one.value)) : 0,
    lowest: read.length > 0 ? Math.min(...read.map((one) => one.value)) : 0,
    readings: read.length,
  }
  /* Found once with the grid, so a renderer and the chart's own drawing draw
     the same lines. */
  field.contours = contoursOf(field, contourLevels(field))
  return field
}

/** How high a cell stands between the lowest and the highest reading, from 0 to 1, or undefined where it has none. */
export const levelOf = (field: SurfaceField, cell: SurfaceCell): number | undefined => {
  if (cell.value === undefined) {
    return undefined
  }
  /* **Between the field's own lowest and highest**, read once with the grid:
     scanning every reading for each corner made a surface of a few thousand
     readings take a second to turn. */
  const { highest: high, lowest: low } = field
  return high === low ? 0.5 : (cell.value - low) / (high - low)
}

/** A contour line's pieces at one height: each a straight segment from one place on the floor to another, in the table's own numbers. */
export interface Contour {
  /** The height the line runs at. */
  level: number
  /** Each segment as two places, across and in depth. */
  segments: Array<[[number, number], [number, number]]>
}

/**
 * The surface's contour lines at `levels`, by marching squares: in each
 * square of the grid whose four readings are all there, a line crosses each
 * edge whose two ends stand either side of the level, at the place along it
 * the level falls. A square whose diagonal corners stand on the same side
 * is read by the middle of the square, the average of its four corners, so
 * the two lines through it never cross.
 */
export const contoursOf = (field: SurfaceField, levels: readonly number[]): Contour[] => {
  const depths = field.depths.length
  const value = (across: number, depth: number): number | undefined =>
    field.cells[across * depths + depth]?.value
  return levels.map((level) => {
    const segments: Contour['segments'] = []
    for (let across = 0; across + 1 < field.acrosses.length; across++) {
      for (let depth = 0; depth + 1 < depths; depth++) {
        const corners = [
          [across, depth],
          [across + 1, depth],
          [across + 1, depth + 1],
          [across, depth + 1],
        ] as const
        const values = corners.map(([a, d]) => value(a, d))
        if (values.some((one) => one === undefined)) {
          continue
        }
        const [v0, v1, v2, v3] = values as [number, number, number, number]
        const place = (from: number, to: number): [number, number] => {
          const [a, b] = [
            corners[from] as readonly [number, number],
            corners[to] as readonly [number, number],
          ]
          const [va, vb] = [values[from] as number, values[to] as number]
          const t = vb === va ? 0.5 : (level - va) / (vb - va)
          const at = (i: number, j: number): number =>
            (field.acrosses[i] as number) +
            ((field.acrosses[j] as number) - (field.acrosses[i] as number)) * t
          const deep = (i: number, j: number): number =>
            (field.depths[i] as number) +
            ((field.depths[j] as number) - (field.depths[i] as number)) * t
          return [at(a[0], b[0]), deep(a[1], b[1])]
        }
        /* The four edges, round the square: its bottom, right, top, and left. */
        const edges: Array<[number, number]> = [
          [0, 1],
          [1, 2],
          [3, 2],
          [0, 3],
        ]
        const crossed = edges
          .filter(
            ([from, to]) => (values[from] as number) >= level !== (values[to] as number) >= level,
          )
          .map(([from, to]) => place(from, to))
        if (crossed.length === 2) {
          segments.push([crossed[0] as [number, number], crossed[1] as [number, number]])
        } else if (crossed.length === 4) {
          const [bottom, right, top, left] = crossed as [
            [number, number],
            [number, number],
            [number, number],
            [number, number],
          ]
          const middle = (v0 + v1 + v2 + v3) / 4 >= level
          if (middle === v0 >= level) {
            segments.push([bottom, right], [top, left])
          } else {
            segments.push([bottom, left], [right, top])
          }
        }
      }
    }
    return { level, segments }
  })
}

/** The levels a surface's contour lines run at: its height's ticks strictly between its lowest and highest reading. */
export const contourLevels = (field: SurfaceField): number[] =>
  field.axes.y.ticks.filter((tick) => tick > field.lowest && tick < field.highest)
