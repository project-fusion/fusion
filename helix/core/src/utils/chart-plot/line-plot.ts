/**
 * What a Line Chart draws of its readings, as arithmetic with no element in
 * it: the web's element and a phone's both draw what this returns.
 *
 * **One path per series**, whatever the number of readings: a series' line is
 * one `d`, its marks are another, each mark a stroke of no length, so a chart
 * of 100,000 readings draws a few paths and not 100,000 shapes. A line of more
 * readings than its plot has columns of pixels keeps only the points those
 * columns show, `columnPoints`.
 *
 * **The scales are the axis charts' own**: a reading sits in the middle of its
 * slot, so the names underneath line up with it, and the scale up the plot
 * covers the range of the series drawn.
 */

import { type Curve, columnPoints, linePath, type Point } from '../line-path/line-path.js'
import { byRow, type Series, type SeriesPoint } from '../read-series/read-series.js'
import { linear, type Scale } from '../scale/scale.js'
import { headroom, ticks } from '../scale/ticks.js'
import { PLOT_HEIGHT, PLOT_WIDTH, seriesIndex } from './plot-box.js'
import { areaPath, type Run } from './sparkline-plot.js'

/** Two decimals, as a mark's place is written, which is more than a 100 unit view box can show. */
const round = (value: number): number => Math.round(value * 100) / 100

/** The two scales an axis chart draws with: along the readings, and up the plot. */
export interface AxisScales {
  /** Where the reading at a place sits across the plot. */
  readonly x: Scale
  /** Where a value sits down the plot, from the top. */
  readonly y: Scale
}

/**
 * The range every series is drawn against: the lowest and the highest
 * reading of the series `shows` keeps, with zero in it under `zero`, or `[0,
 * 0]` with no reading. A walk over the readings, which builds no array of
 * every value.
 *
 * **Room above the peak under `room`**, which a chart gives wherever the
 * scale is drawn, so the top edge is a numbered level and the highest reading
 * stands clear of it. A chart with no axis and no rules is read as a shape,
 * and keeps the whole height.
 */
export const lineDomain = (
  series: readonly Series[],
  shows: (name: string) => boolean,
  zero: boolean,
  room = false,
): [number, number] => {
  let low = Number.POSITIVE_INFINITY
  let high = Number.NEGATIVE_INFINITY
  for (const one of series) {
    if (!shows(one.name)) {
      continue
    }
    for (const point of one.points) {
      low = Math.min(low, point.value)
      high = Math.max(high, point.value)
    }
  }
  const [floor, top] = low <= high ? [low, high] : [0, 0]
  const extent: [number, number] = zero ? [Math.min(0, floor), Math.max(0, top)] : [floor, top]
  return room ? headroom(extent) : extent
}

/**
 * The scales of an axis chart of `count` readings over `domain`: **a reading
 * sits in the middle of its own slot**, inset by half a slot at each end, so
 * the names underneath, each centered in its slot, line up with it, and a
 * line chart and a bar chart from the same table stack.
 */
export const axisScales = (domain: readonly [number, number], count: number): AxisScales => {
  const slot = PLOT_WIDTH / count
  return {
    x: linear([0, Math.max(count - 1, 1)], [slot / 2, PLOT_WIDTH - slot / 2]),
    y: linear(domain, [PLOT_HEIGHT, 0]),
  }
}

/**
 * A series' unbroken runs as paths through their points, a run of more
 * readings than `columns` keeping only the points those columns show. A run
 * that draws nothing is left out.
 */
export const seriesRuns = (
  runs: readonly (readonly SeriesPoint[])[],
  scales: AxisScales,
  curve: Curve,
  columns: number,
): Run[] =>
  runs
    .map((run) => {
      const points: Point[] = run.map((point) => [scales.x(point.at), scales.y(point.value)])
      return { path: linePath(columnPoints(points, columns, PLOT_WIDTH), curve), run: points }
    })
    .filter((one) => one.path !== '')

/** The wash under a series' runs: each closed down to the floor of the plot. */
export const lineWash = (runs: readonly Run[]): string => areaPath(runs, PLOT_HEIGHT)

/** A series' marks as path data: a stroke of no length at each reading. */
export interface LineMarks {
  /** The readings with a blank on either side, which no line reaches. */
  readonly lone: string
  /** Every other reading, under `markers`, or empty. */
  readonly marks: string
}

/**
 * A series' marks as path data, a stroke of no length at each, which a round
 * cap draws as a dot: the runs of more than one reading under `markers`, and
 * the runs of one always.
 */
export const lineMarks = (
  runs: readonly (readonly SeriesPoint[])[],
  scales: AxisScales,
  markers: boolean,
): LineMarks => {
  const dot = (point: Point): string => `M${point[0]},${point[1]}h0`
  let marks = ''
  let lone = ''
  for (const run of runs) {
    const points = run.map(
      (point): Point => [round(scales.x(point.at)), round(scales.y(point.value))],
    )
    if (points.length === 1) {
      lone += dot(points[0] as Point)
    } else if (markers) {
      marks += points.map(dot).join('')
    }
  }
  return { lone, marks }
}

/** Where a series ended, as percentages of the drawing's box, with its palette slot. */
export interface LineEnd {
  readonly index: number
  readonly x: number
  readonly y: number
}

/**
 * Where each series `shows` keeps ended, as percentages of the drawing's own
 * box, which `preserveAspectRatio="none"` does not stretch. A series of one
 * reading is a point and has no end to mark.
 */
export const lineEnds = (
  series: readonly Series[],
  shows: (name: string) => boolean,
  scales: AxisScales,
): LineEnd[] =>
  series.flatMap((one, depth) => {
    const last = one.points.at(-1)
    if (!shows(one.name) || !last || one.points.length < 2) {
      return []
    }
    return [
      {
        index: seriesIndex(depth),
        x: (scales.x(last.at) / PLOT_WIDTH) * 100,
        y: (scales.y(last.value) / PLOT_HEIGHT) * 100,
      },
    ]
  })

/** Where the rule at zero runs down the plot, or none where zero is outside the range. */
export const baselineAt = (domain: readonly [number, number], y: Scale): number | undefined =>
  domain[0] <= 0 && domain[1] >= 0 ? y(0) : undefined

/** Where each rule across the plot runs, at the levels `ticks` picks, above `floor` where one is given. */
export const levelRules = (domain: readonly [number, number], y: Scale, floor?: number): number[] =>
  ticks(domain)
    .filter((level) => floor === undefined || level > floor)
    .map((level) => y(level))

/** The slot of the reading at `at` among `count`, in the drawing's units: where it starts and how wide it is. */
export const slotOf = (
  at: number,
  count: number,
): { readonly width: number; readonly x: number } => {
  const width = PLOT_WIDTH / count
  return { width, x: at * width }
}

/**
 * Where the bubble for the reading at `at` stands, as percentages of the
 * plot: across, the middle of its slot, and down, the topmost series drawn
 * there, so the bubble never covers the line it describes. The top of the
 * plot where no series has a reading there.
 */
export const lineTipAt = (
  slots: readonly (readonly (SeriesPoint | undefined)[])[],
  at: number,
  count: number,
  y: Scale,
): { readonly x: string; readonly y: string } => {
  const tops = slots
    .map((one) => one[at]?.value)
    .filter((one): one is number => one !== undefined)
    .map((one) => y(one))
  const slot = 100 / count
  return { x: `${at * slot + slot / 2}%`, y: `${tops.length > 0 ? Math.min(...tops) : 0}%` }
}

/** Each series `shows` keeps laid out one slot per row, as the bubble reads them. */
export const shownSlots = (
  series: readonly Series[],
  shows: (name: string) => boolean,
  count: number,
): (SeriesPoint | undefined)[][] =>
  series.filter((one) => shows(one.name)).map((one) => byRow(one, count))

/** Each series' latest reading, as the summary says it: its row's name, and the series with the cell as written. */
export interface Latest {
  readonly label: string
  readonly reading: string
}

/**
 * Each drawn series' latest reading, for the summary: the series' own last
 * reading, so a series with a blank in the last row still says where it was,
 * written as `text` gives the cell, or the number where the cell has none.
 */
export const latestReadings = (
  series: readonly Series[],
  shows: (name: string) => boolean,
  text: (depth: number, at: number) => string | undefined,
): Latest[] =>
  series.flatMap((one, depth) => {
    const last = one.points.at(-1)
    if (last === undefined || !shows(one.name)) {
      return []
    }
    return [
      { label: last.label, reading: `${one.name} ${text(depth, last.at) ?? String(last.value)}` },
    ]
  })

/**
 * The summary's body: one row's name where every series ended on the same
 * row, the readings listed as `list` lists them, and each its own name where
 * they did not.
 */
export const latestWords = (
  latest: readonly Latest[],
  list: (items: string[]) => string,
): string =>
  latest.every((one) => one.label === latest[0]?.label)
    ? `${latest[0]?.label ?? ''}: ${list(latest.map((one) => one.reading))}`
    : latest.map((one) => `${one.label}: ${one.reading}`).join('; ')
