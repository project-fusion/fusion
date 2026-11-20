/**
 * What a Sparkline draws and says of its readings, as arithmetic with no
 * element in it: the web's element and a phone's both draw what this returns.
 *
 * **The marks are numbers, and each platform writes them its own way.** The
 * web writes a path's `d`, a column's `x` and `height`, and a mark's place as
 * an inline `inset`; a phone binds the same numbers to its vector's shapes and
 * to the views it lays over them.
 */

import { type Curve, linePath, type Point } from '../line-path/line-path.js'
import { extremesOf, type Series, unbroken } from '../read-series/read-series.js'
import { extent, linear } from '../scale/scale.js'
import { PLOT_WIDTH } from './plot-box.js'

/**
 * How tall the strip is drawn, which is the one coordinate this family states.
 *
 * A sparkline is a line beside a number and not a plot, so it is the one
 * drawing here that is not square: the width is `PLOT_WIDTH` like every other
 * chart's, and this is 32 against that 100.
 */
export const STRIP_HEIGHT = 32

/**
 * A reading in words, for the readout: the row's name where a table gave one,
 * the reading as it is written, and where it stands in brackets, such as
 * "Mon: 12 (3 of 7)". The same order every chart's readout uses.
 */
export const readingWords = (label: string, text: string, position: string): string => {
  const named = label === '' ? text : text === '' ? label : `${label}: ${text}`
  return position === '' ? named : `${named} (${position})`
}

/**
 * The readings in their places: `count` slots, each holding the value read at
 * that place, or nothing where the place is blank. A point outside the places
 * is left out.
 */
export const slotsOf = (
  points: readonly { at: number; value: number }[],
  count: number,
): (number | undefined)[] => {
  const slots: (number | undefined)[] = Array.from({ length: count }, () => undefined)
  for (const point of points) {
    if (point.at >= 0 && point.at < count) {
      slots[point.at] = point.value
    }
  }
  return slots
}

/** One unbroken stretch of the line: its drawn path and the points it runs through. */
export interface Run {
  /** The path the line draws through the points. */
  path: string
  /** The points, in drawing coordinates. */
  run: readonly Point[]
}

/**
 * Each run of the line closed down to `floor`, the path the wash fills: the
 * run's own path, then down from its last point, across and back up to its
 * first. Empty where there are no runs.
 */
export const areaPath = (runs: readonly Run[], floor: number): string =>
  runs
    .map((one) => {
      const first = one.run[0] as Point
      const last = one.run.at(-1) as Point
      return `${one.path}L${last[0]},${floor}L${first[0]},${floor}Z`
    })
    .join('')

/** The readings an overview names, each as the readout writes it. */
export interface Overview {
  /** The first reading. */
  first: string
  /** The highest reading. */
  high: string
  /** The last reading. */
  last: string
  /** The lowest reading. */
  low: string
}

/**
 * What the readings come to, as `say` puts it: the first and the last
 * reading, and the highest and the lowest, each written by `write`. Empty
 * where there are fewer than two readings, which make no trend.
 */
export const overviewWords = (
  say: (overview: Overview) => string,
  slots: readonly (number | undefined)[],
  write: (at: number) => string,
): string => {
  const placed = slots.flatMap((value, at) => (value === undefined ? [] : [at]))
  const first = placed[0]
  const last = placed.at(-1)
  const { high, low } = extremesOf(slots)
  if (placed.length < 2 || first === undefined || last === undefined) {
    return ''
  }
  return say({
    first: write(first),
    high: write(high as number),
    last: write(last),
    low: write(low as number),
  })
}

/** What a sparkline draws its readings as. */
export type SparklineKind = 'area' | 'bar' | 'line'

/** What a sparkline's drawing is made from. */
export interface SparklineInput {
  /** How many readings there are room for, blanks among them. */
  readonly count: number
  /** How the line runs from one reading to the next. Absent is `smooth`. */
  readonly curve?: Curve | undefined
  /** The two values a band is drawn between, lower first. */
  readonly band?: readonly [number, number] | undefined
  /** What the readings are drawn as. Absent is `area`. */
  readonly plot?: SparklineKind | undefined
  /** The series drawn. */
  readonly series: Series
}

/** A place in the box, as percentages of it from the inline start and the top. */
export interface Placed {
  readonly x: number
  readonly y: number
}

/** A column of a bar plot, in the drawing's units. */
export interface Column {
  readonly height: number
  readonly width: number
  readonly x: number
  readonly y: number
}

/** What a sparkline draws. */
export interface SparklinePlot {
  /** The area's path: the line closed down to its floor, or empty where none is washed. */
  readonly area: string
  /** The band `range` asks for, in the drawing's units, or none. */
  readonly band?: { readonly height: number; readonly y: number }
  /** Each column of a bar plot, in order. */
  readonly bars: readonly Column[]
  /** The line's path, one stretch for each unbroken run, or empty. */
  readonly line: string
  /** Where each reading no line reaches stands, with a blank or an end on each side. */
  readonly lone: readonly Placed[]
  /** Where a reading stands in the box: on the line, or on the top of its column. */
  readonly place: (index: number, value: number) => Placed
  /** How many readings hold a value. */
  readonly placed: number
  /** The readings in their places. */
  readonly slots: readonly (number | undefined)[]
  /** Where the series ended, where two or more readings make a line. */
  readonly terminus?: Placed
}

/** The scale up the strip: from zero for a bar, which measures from it, and over the data otherwise. */
const scaleUp = (input: SparklineInput, points: readonly number[]) => {
  const [low, high] = extent(points.length > 0 ? [...points, ...(input.band ?? [])] : [0])
  /* **A bar measures from zero and a line measures from its own range**, and
     that is a correctness difference and not a preference. A bar's *length* is
     the value, so a baseline anywhere but zero makes the lengths proportional
     to nothing. The zero is included at both ends, so a series that goes
     negative gets a baseline inside the box and its columns hang below it. */
  return input.plot === 'bar'
    ? linear([Math.min(0, low), Math.max(0, high)], [STRIP_HEIGHT, 0])
    : linear([low, high], [STRIP_HEIGHT, 0])
}

/**
 * One column per reading, inset so neighbors do not touch: 72 percent of its
 * slot, with 14 percent of the slot off each side, from the baseline to the
 * reading. A reading of exactly zero is a column of no height.
 */
const columnsOf = (
  slots: readonly (number | undefined)[],
  slot: number,
  y: (value: number) => number,
): Column[] => {
  const floor = y(0)
  return slots.flatMap((value, index) =>
    value === undefined
      ? []
      : [
          {
            height: Math.abs(floor - y(value)),
            width: slot * 0.72,
            x: index * slot + slot * 0.14,
            y: Math.min(floor, y(value)),
          },
        ],
  )
}

/**
 * What a sparkline draws from its readings: the line, its wash, the columns,
 * the band, and where each mark stands.
 *
 * Two points at least make a line, since one is no trend and zero is no line.
 * The wash is the line closed down to the floor of its own range, its own path,
 * since a closed path strokes its closing edges too.
 */
export const sparklinePlot = (input: SparklineInput): SparklinePlot => {
  const { count, series } = input
  const slots = slotsOf(series.points, count)
  const points = slots.filter((value): value is number => value !== undefined)
  const x = linear([0, Math.max(count - 1, 1)], [0, PLOT_WIDTH])
  const y = scaleUp(input, points)
  const bar = input.plot === 'bar'
  const runs = bar
    ? []
    : unbroken(series)
        .map((run) => run.map((point): Point => [x(point.at), y(point.value)]))
        .map((run) => ({ path: linePath(run, input.curve ?? 'smooth'), run }))
        .filter((one) => one.path !== '')
  const line = runs.map((one) => one.path).join('')
  /* Asked negatively, because absent *is* an area. */
  const area = !bar && input.plot !== 'line' && line !== '' ? areaPath(runs, STRIP_HEIGHT) : ''
  const slot = PLOT_WIDTH / Math.max(count, 1)
  const band = input.band
  const lastAt = slots.findLastIndex((value) => value !== undefined)
  const place = (index: number, value: number): Placed => ({
    x: ((bar ? index * slot + slot / 2 : x(index)) / PLOT_WIDTH) * 100,
    y: (y(value) / STRIP_HEIGHT) * 100,
  })
  const lone =
    points.length < 2 || bar
      ? []
      : unbroken(series)
          .filter((run) => run.length === 1)
          .map(([point]) => place(point?.at ?? 0, point?.value ?? 0))
  return {
    area,
    ...(band === undefined
      ? {}
      : {
          band: { height: Math.abs(y(band[0]) - y(band[1])), y: Math.min(y(band[0]), y(band[1])) },
        }),
    bars: bar ? columnsOf(slots, slot, y) : [],
    line,
    lone,
    place,
    placed: points.length,
    slots,
    ...(points.length < 2
      ? {}
      : {
          terminus: {
            x: (x(lastAt) / PLOT_WIDTH) * 100,
            y: (y(slots[lastAt] as number) / STRIP_HEIGHT) * 100,
          },
        }),
  }
}

/** Where the highest and the lowest readings a sparkline's `marks` ask for stand, by name. */
export const sparklineMarks = (
  plot: SparklinePlot,
  asked: readonly string[],
): { readonly high?: Placed; readonly low?: Placed } => {
  const found = extremesOf(plot.slots)
  const at = (index: number | undefined, name: 'high' | 'low'): Placed | undefined =>
    asked.includes(name) && index !== undefined
      ? plot.place(index, plot.slots[index] as number)
      : undefined
  const high = at(found.high, 'high')
  const low = at(found.low, 'low')
  return { ...(high === undefined ? {} : { high }), ...(low === undefined ? {} : { low }) }
}
