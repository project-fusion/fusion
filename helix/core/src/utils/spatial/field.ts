/*
 * A 3D scatter's table read as points, axes, and groups.
 *
 * Kept apart from the element because it is arithmetic a picture hides: a
 * range that does not reach the round numbers either side puts a point on
 * the edge of the box, and a row read into the wrong axis looks like data.
 */

import type {
  MotionItem,
  MotionShares,
} from '../../controllers/readings-motion-controller/readings-motion-controller.js'
import { keysOf, mix, mixAxis } from '../readings-motion/readings-motion.js'
import { ticks } from '../scale/ticks.js'

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
  /**
   * What the point is known by from one table to the next, on a field drawn
   * between two while the readings move. A table's own field has none.
   */
  key?: string | undefined
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
  /**
   * The words written at the ticks, in their order, for an axis of names such
   * as a bar chart's categories, which stand at 0, 1, 2 and on. Absent, each
   * tick is written as its number.
   */
  labels?: readonly string[] | undefined
  name: string
  range: [number, number]
  /** Where the grid's lines run along this axis, where not at the ticks: between the names of an axis of names. */
  rules?: readonly number[] | undefined
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

/**
 * The key of each point of `field`, in its order: its label, numbered where
 * a label comes again. A field drawn between two tables carries each point's
 * key with it.
 */
export const pointKeys = (field: PlotField): string[] => {
  const keys = keysOf(field.points.map((point) => point.label))
  return field.points.map((point, index) => point.key ?? (keys[index] as string))
}

/** Each point as the chart's motion knows it: by its key, growing in in the table's order. */
export const pointItems = (field: PlotField): MotionItem[] =>
  pointKeys(field).map((key, step) => ({ key, step }))

/**
 * The points `at` the shares between `from` and `to`, which the chart draws
 * while its readings move. **A point both tables hold moves** from its old
 * place to its new one, **a point only `to` holds rises** from the floor of
 * the box where it stands across and in depth, and **a point only `from`
 * held sinks** to the floor, after `to`'s points, and goes. The axes move
 * with `at.axes`. With no `from`, every point rises from the floor.
 */
export const pointsBetween = (
  from: PlotField | undefined,
  to: PlotField,
  at: MotionShares,
): PlotField => {
  const axes =
    from && at.axes < 1
      ? {
          x: mixAxis(from.axes.x, to.axes.x, at.axes),
          y: mixAxis(from.axes.y, to.axes.y, at.axes),
          z: mixAxis(from.axes.z, to.axes.z, at.axes),
        }
      : to.axes
  const floor = axes.y.range[0]
  const before = new Map<string, PlotPoint>()
  if (from) {
    const had = pointKeys(from)
    from.points.forEach((point, index) => {
      before.set(had[index] as string, point)
    })
  }
  const keys = pointKeys(to)
  const points: PlotPoint[] = to.points.map((point, index) => {
    const key = keys[index] as string
    const share = at.share(key)
    const old = before.get(key)
    if (!old || at.floor(key)) {
      return { ...point, key, y: mix(floor, point.y, share) }
    }
    return {
      ...point,
      key,
      x: mix(old.x, point.x, share),
      y: mix(old.y, point.y, share),
      z: mix(old.z, point.z, share),
    }
  })
  const kept = new Set(keys)
  for (const [key, old] of before) {
    const share = at.share(key)
    if (!kept.has(key) && share < 1) {
      points.push({ ...old, key, y: mix(old.y, floor, share) })
    }
  }
  return { ...to, axes, points }
}
