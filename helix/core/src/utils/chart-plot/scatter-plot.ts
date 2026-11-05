/**
 * What a Scatter Chart draws of its readings, as arithmetic with no element in
 * it: the web's element and a phone's both draw what this returns.
 *
 * **One point a row and series**, placed by two measures: the table's first
 * numeric column across and each other one up, with a third, `size-by`, as
 * each point's area. **A series' points are paths**, each point a stroke of no
 * length that a round cap draws as a dot, in a few layers so points that
 * overlap keep their rings, so 100,000 rows are a few dozen paths.
 */

import type { Row } from '../read-series/read-series.js'
import { linear, type Scale } from '../scale/scale.js'
import { ticks } from '../scale/ticks.js'
import { PLOT_HEIGHT, PLOT_WIDTH } from './plot-box.js'
import { type Fit, leastSquares } from './scatter-fit.js'
import { layersOf } from './scatter-layers.js'
import { bubbleWeights, type Measures } from './scatter-measures.js'

/** How many layers a series' points are drawn in at most. See `layersOf`. */
export const SCATTER_LAYERS = 4

/**
 * How many steps a point's size under `size-by` is drawn in: its weight to the
 * nearest thirty-second, a pixel of diameter between the point and the bubble.
 * A path draws its points at one size, so a series takes a path a size.
 */
const WEIGHTS = 32

/** Two decimals, as a point's path is written, which is more than a 100 unit view box can show. */
const round = (value: number): number => Math.round(value * 100) / 100

/** One row drawn as a point: which row, which series, and where, in percent of the plot. */
export interface ScatterPoint {
  depth: number
  row: number
  /**
   * How large the point is drawn under `size-by`, from 0 to 1: the square root
   * of its share of the largest size, so its area follows the measure.
   */
  weight?: number | undefined
  x: number
  y: number
}

/** The table as the chart reads it: points, both ranges and what each axis is called. */
export interface ScatterField {
  points: ScatterPoint[]
  /** Each series' readings as pairs, for the summary. */
  pairs: Array<Array<[number, number]>>
  x: [number, number]
  xName: string
  y: [number, number]
  yNames: string[]
}

/**
 * A range widened to the round numbers either side of it, so the first and
 * last tick are the edges of the plot. Rounded to twelve places, because a step
 * of 0.1 multiplied back out is 0.30000000000000004.
 */
export const scatterNice = ([low, high]: [number, number]): [number, number] => {
  if (low === high) {
    return [low - 1, high + 1]
  }
  const levels = ticks([low, high])
  const step = levels.length > 1 ? (levels[1] as number) - (levels[0] as number) : high - low
  const twelve = (value: number): number => Number(value.toPrecision(12))
  return [twelve(Math.floor(low / step) * step), twelve(Math.ceil(high / step) * step)]
}

/** The scales of a field: across from its left edge, and up from its foot. */
export const scatterScales = (field: ScatterField): { along: Scale; up: Scale } => ({
  along: linear(field.x, [0, PLOT_WIDTH]),
  up: linear(field.y, [PLOT_HEIGHT, 0]),
})

/**
 * The rows as points, in one walk: each series' pairs and the rows they came
 * from, over the ranges of the series `shown` keeps. A series a legend hid
 * draws no points and stretches no scale, and keeps its depth, so the others
 * keep their colors.
 */
export const scatterField = (
  rows: readonly Row[],
  measures: Measures,
  shown: readonly boolean[],
  name: (column: number | undefined) => string,
): ScatterField => {
  const { across, size, ups } = measures
  const pairs: Array<Array<[number, number]>> = ups.map(() => [])
  const from: number[][] = ups.map(() => [])
  let [left, right, low, high] = [
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]
  rows.forEach((row, index) => {
    const acrossValue = across === undefined ? undefined : row.cells[across]?.value
    if (acrossValue === undefined) {
      return
    }
    ups.forEach((column, depth) => {
      const upValue = row.cells[column]?.value
      if (upValue === undefined) {
        return
      }
      pairs[depth]?.push([acrossValue, upValue])
      from[depth]?.push(index)
      if (shown[depth]) {
        left = Math.min(left, acrossValue)
        right = Math.max(right, acrossValue)
        low = Math.min(low, upValue)
        high = Math.max(high, upValue)
      }
    })
  })
  const any = left <= right
  const x = scatterNice(any ? [left, right] : [0, 0])
  const y = scatterNice(any ? [low, high] : [0, 0])
  const along = linear(x, [0, PLOT_WIDTH])
  const up = linear(y, [PLOT_HEIGHT, 0])
  /* By area, so a point twice the measure is twice the ink, to the nearest of `WEIGHTS` steps. */
  const weights = bubbleWeights(
    rows.map((row) => (size === undefined ? undefined : row.cells[size]?.value)),
  ).map((one) => (one === undefined ? undefined : Math.round(one * WEIGHTS) / WEIGHTS))
  return {
    pairs,
    points: pairs.flatMap((series, depth) =>
      shown[depth]
        ? series.map(([one, two], place) => {
            const row = from[depth]?.[place] as number
            return { depth, row, weight: weights[row], x: along(one), y: up(two) }
          })
        : [],
    ),
    x,
    xName: name(across),
    y,
    yNames: ups.map((column) => name(column)),
  }
}

/** One path of a series' layer: the dots of one size, and that size's weight. */
export interface ScatterPath {
  readonly d: string
  readonly weight: number | undefined
}

/** One layer of a series' points, in its palette place. */
export interface ScatterLayer {
  readonly depth: number
  readonly paths: readonly ScatterPath[]
}

/**
 * Each series' points as layers of paths, a path a size: placed in the plot's
 * `box` in pixels, a point in the layer that leaves its ring whole, at most
 * `SCATTER_LAYERS`, where `ringOf` gives each point's ring. Before the rings
 * are measured, every point is in one layer.
 */
export const scatterLayers = (
  field: ScatterField,
  box: { readonly height: number; readonly width: number },
  ratio: number,
  ringOf: ((point: ScatterPoint) => number) | undefined,
): ScatterLayer[] => {
  const series = new Map<number, ScatterPoint[]>()
  for (const point of field.points) {
    const held = series.get(point.depth)
    if (held) {
      held.push(point)
    } else {
      series.set(point.depth, [point])
    }
  }
  return [...series].flatMap(([depth, points]) => {
    const placed = points.map((point) => ({
      width: ringOf === undefined ? 0 : ringOf(point),
      x: (point.x / PLOT_WIDTH) * box.width,
      y: (point.y / PLOT_HEIGHT) * box.height,
    }))
    return layersOf(placed, ringOf === undefined ? 1 : SCATTER_LAYERS, ratio).map((layer) => {
      const sized = new Map<number | undefined, string[]>()
      for (const at of layer) {
        const point = points[at] as ScatterPoint
        const held = sized.get(point.weight)
        const dot = `M${round(point.x)},${round(point.y)}h0`
        if (held) {
          held.push(dot)
        } else {
          sized.set(point.weight, [dot])
        }
      }
      return { depth, paths: [...sized].map(([weight, dots]) => ({ d: dots.join(''), weight })) }
    })
  })
}

/** Each series' line of best fit across the plot, from the left edge to the right, where it has one. */
export const scatterTrends = (
  field: ScatterField,
  shows: (name: string) => boolean,
  fitOf: (pairs: Array<[number, number]>) => Fit | undefined = leastSquares,
  { along, up } = scatterScales(field),
): { depth: number; x1: number; x2: number; y1: number; y2: number }[] => {
  const [start, end] = field.x
  return field.yNames.flatMap((name, depth) => {
    const fit = shows(name) ? fitOf(field.pairs[depth] ?? []) : undefined
    return fit === undefined
      ? []
      : [
          {
            depth,
            x1: along(start),
            x2: along(end),
            y1: up(fit.intercept + fit.slope * start),
            y2: up(fit.intercept + fit.slope * end),
          },
        ]
  })
}

/** The rows in the order the keys walk them: left to right across the plot, a row with nothing across last. */
export const scatterOrder = (rows: readonly Row[], across: number | undefined): number[] => {
  const x = (at: number): number =>
    (across === undefined ? undefined : rows[at]?.cells[across]?.value) ?? Number.POSITIVE_INFINITY
  return rows.map((_, at) => at).sort((one, two) => x(one) - x(two) || one - two)
}

/**
 * The point nearest a point of the plot `box`, in pixels from its top left,
 * within `reach` pixels, or `undefined` for none.
 */
export const scatterNearest = (
  points: readonly ScatterPoint[],
  box: { readonly height: number; readonly width: number },
  at: { readonly x: number; readonly y: number },
  reach: number,
): ScatterPoint | undefined => {
  let found: ScatterPoint | undefined
  let best = reach ** 2
  for (const point of points) {
    const distance =
      ((point.x / PLOT_WIDTH) * box.width - at.x) ** 2 +
      ((point.y / PLOT_HEIGHT) * box.height - at.y) ** 2
    if (distance <= best) {
      best = distance
      found = point
    }
  }
  return found
}

/** The levels of a field's two scales, each where it stands in percent, the last across marked at the far edge. */
export const scatterTicks = (field: ScatterField) => {
  const { along, up } = scatterScales(field)
  return {
    x: ticks(field.x).map((level) => ({
      edge: along(level) >= PLOT_WIDTH,
      level,
      place: along(level),
    })),
    y: ticks(field.y).map((level) => ({ level, place: up(level) })),
  }
}

export { correlation, type Fit, leastSquares } from './scatter-fit.js'
export { layersOf, type Placed as ScatterPlaced } from './scatter-layers.js'
export { bubbleWeights, type Measures, measuresOf } from './scatter-measures.js'
