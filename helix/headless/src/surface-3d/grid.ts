/**
 * A 3D surface's table read as a grid of heights.
 *
 * Kept apart from the element because it is arithmetic a picture hides: a
 * reading put in the wrong cell bends the surface in a place the data never
 * did, and a missing reading drawn as zero digs a pit that is not there.
 */

import { ticks } from '@fusion.dev/helix-core'
import { type FieldRow, niceRange, type PlotAxis } from '../scatter-3d/field.js'

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
  return {
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
    depths,
    readings: read.length,
  }
}

/** How high a cell stands between the lowest and the highest reading, from 0 to 1, or undefined where it has none. */
export const levelOf = (field: SurfaceField, cell: SurfaceCell): number | undefined => {
  if (cell.value === undefined) {
    return undefined
  }
  const values = field.cells.flatMap((one) => (one.value === undefined ? [] : [one.value]))
  const [low, high] = [Math.min(...values), Math.max(...values)]
  return high === low ? 0.5 : (cell.value - low) / (high - low)
}
