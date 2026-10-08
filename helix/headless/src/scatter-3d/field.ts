/**
 * A 3D scatter's table read as points, axes, and groups.
 *
 * Kept apart from the element because it is arithmetic a picture hides: a
 * range that does not reach the round numbers either side puts a point on
 * the edge of the box, and a row read into the wrong axis looks like data.
 */

import { ticks } from '@fusion.dev/helix-core'

/** What the field reads of a row: its label and its cells, with their headings and numbers. */
export interface FieldRow {
  cells: readonly { name: string; text: string; value?: number | undefined }[]
  label: string
}

/** One row drawn as a point. */
export interface PlotPoint {
  /** The point's group, from the `group-by` column, or `''` where there is none. */
  group: string
  /** The point's place among the groups, which its color is read by. */
  groupIndex: number
  /** The row's own label. */
  label: string
  /** The row it was read from, counting from zero. */
  row: number
  /** Across, up, and in depth, in the table's own numbers. */
  x: number
  y: number
  z: number
}

/** One axis: its column's name, its range widened to round numbers, and the ticks on it. */
export interface PlotAxis {
  name: string
  range: [number, number]
  ticks: number[]
}

/** The table as a 3D scatter reads it. */
export interface PlotField {
  axes: { x: PlotAxis; y: PlotAxis; z: PlotAxis }
  /** Every group, in the order its first row comes. */
  groups: string[]
  points: PlotPoint[]
}

/**
 * A range widened to the round numbers either side of it, so the first and
 * last tick are the edges of the box and no point sits on its border. A
 * range of one number is widened by one either way.
 */
export const niceRange = (low: number, high: number): [number, number] => {
  if (!Number.isFinite(low) || !Number.isFinite(high)) {
    return [0, 1]
  }
  if (low === high) {
    return [low - 1, high + 1]
  }
  const levels = ticks([low, high])
  const step = levels.length > 1 ? (levels[1] as number) - (levels[0] as number) : high - low
  const round = (value: number): number => Number(value.toPrecision(12))
  return [round(Math.floor(low / step) * step), round(Math.ceil(high / step) * step)]
}

/**
 * Reads the table: **the first three numeric columns are across, up, and in
 * depth**, and `groupBy` names a column whose text puts each point in a
 * group. A row that lacks any of the three numbers is left out, since a
 * point needs all three to stand anywhere.
 */
export const fieldOf = (
  rows: readonly FieldRow[],
  columns: readonly number[],
  groupBy = '',
): PlotField => {
  const [xAt, yAt, zAt] = columns.filter((column) => {
    const name = rows.find((row) => row.cells[column])?.cells[column]?.name ?? ''
    return name !== groupBy
  })
  const nameOf = (column: number | undefined): string =>
    column === undefined ? '' : (rows.find((row) => row.cells[column])?.cells[column]?.name ?? '')
  const groups: string[] = []
  const points: PlotPoint[] = []
  rows.forEach((row, at) => {
    const value = (column: number | undefined): number | undefined =>
      column === undefined ? undefined : row.cells[column]?.value
    const [x, y, z] = [value(xAt), value(yAt), value(zAt)]
    if (!(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z))) {
      return
    }
    const group = groupBy ? (row.cells.find((cell) => cell.name === groupBy)?.text ?? '') : ''
    let groupIndex = groups.indexOf(group)
    if (groupIndex < 0) {
      groupIndex = groups.push(group) - 1
    }
    points.push({
      group,
      groupIndex,
      label: row.label,
      row: at,
      x: x as number,
      y: y as number,
      z: z as number,
    })
  })
  const axis = (column: number | undefined, read: (point: PlotPoint) => number): PlotAxis => {
    const values = points.map(read)
    const range = niceRange(Math.min(...values), Math.max(...values))
    return { name: nameOf(column), range, ticks: ticks(range) }
  }
  return {
    axes: {
      x: axis(xAt, (point) => point.x),
      y: axis(yAt, (point) => point.y),
      z: axis(zAt, (point) => point.z),
    },
    groups,
    points,
  }
}

/** Where a number stands along an axis, from 0 at its low end to 1 at its high end. */
export const along = (axis: PlotAxis, value: number): number => {
  const [low, high] = axis.range
  return high === low ? 0.5 : (value - low) / (high - low)
}
