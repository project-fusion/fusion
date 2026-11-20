/**
 * What a Bar Chart draws of its readings beside the columns' boxes, as
 * arithmetic with no element in it: the paths of a chart of more columns than
 * its plot has pixels, one for each series, tone, and side of zero, so 10,000
 * columns are a few paths and not 10,000 shapes; a series drawn as a line;
 * the band and the bubble's place for the category shown; each series'
 * highest reading; and a column's outline as a phone draws it.
 */

import { columnPoints, linePath, type Point } from '../line-path/line-path.js'
import { type Series, type SeriesPoint, unbroken } from '../read-series/read-series.js'
import type { Scale } from '../scale/scale.js'
import { type BarLayout, barBox, type ColumnBox } from './bar-plot.js'
import { type StackEnd, stackEnds } from './bar-stack.js'
import { PLOT_WIDTH } from './plot-box.js'

/** Four decimals, as a path of columns is written: a column a hundredth of a pixel thick keeps its width. */
const round = (value: number): number => Math.round(value * 10_000) / 10_000

/**
 * Whether the columns are drawn as paths: where a column, or the space
 * between two categories, is less than a device pixel, `units` the drawing's
 * units in a CSS pixel and `ratio` the device pixels in one.
 */
export const barDense = (layout: BarLayout, units: number, ratio: number): boolean => {
  const thickness = barBox(layout, 0, 0, 0, () => 0).thickness
  return units > 0 && Math.min(thickness, layout.slot * 0.28) < units / ratio
}

/** A column of a path of columns, as `barPaths` hands it to be added. */
export interface PathColumn {
  readonly depth: number
  readonly ink: string | undefined
  readonly sinks: boolean
  readonly tone: number
}

/** A path of the columns of one series that share a `data-tone` and a side of zero. */
export interface BarPath {
  readonly d: string
  readonly ink: string | undefined
  readonly sinks: boolean
  readonly tone: number
}

/**
 * Every column as a rectangle in a path, which `each` gives a category at
 * a time: one path for the columns of each series that share a `data-tone`
 * and a side of zero. **A column of device pixels is one rectangle a path**,
 * from the nearest end any column in it reaches to the farthest, and the
 * series that stand side by side share the pixel, so a path keeps the lowest
 * and the highest point of each column of pixels.
 */
export const barPaths = (
  plot: {
    readonly abreast: number
    readonly count: number
    readonly pixel: number
    readonly sideways: boolean
    readonly slot: number
  },
  each: (index: number, add: (box: ColumnBox, column: PathColumn) => void) => void,
): BarPath[] => {
  const { abreast, count, pixel, sideways, slot } = plot
  const paths = new Map<
    string,
    { d: string[]; reaches: Map<number, [number, number]> } & PathColumn
  >()
  const rectangle = (across: number, along: number, thickness: number, size: number): string => {
    const [x, y, width, height] = sideways
      ? [along, across, size, thickness]
      : [across, along, thickness, size]
    return `M${round(x)},${round(y)}h${round(width)}v${round(height)}h${-round(width)}z`
  }
  for (let index = 0; index < count; index += 1) {
    each(index, (box, { depth, ink, sinks, tone }) => {
      const key = `${tone} ${ink ?? ''} ${sinks}`
      let path = paths.get(key)
      if (path === undefined) {
        path = { d: [], depth, ink, reaches: new Map(), sinks, tone }
        paths.set(key, path)
      }
      /* Every column of pixels the category's slot reaches into. */
      const last = Math.ceil(((index + 1) * slot) / pixel) - 1
      for (let at = Math.floor((index * slot) / pixel); at <= last; at += 1) {
        const reach = path.reaches.get(at)
        if (reach === undefined) {
          path.reaches.set(at, [box.along, box.along + box.size])
        } else {
          reach[0] = Math.min(reach[0], box.along)
          reach[1] = Math.max(reach[1], box.along + box.size)
        }
      }
    })
  }
  const share = pixel / Math.max(abreast, 1)
  for (const path of paths.values()) {
    for (const [at, [near, far]] of path.reaches) {
      path.d.push(rectangle(at * pixel + path.depth * share, near, share, far - near))
    }
  }
  return [...paths.values()].map(({ d, ink, sinks, tone }) => ({ d: d.join(''), ink, sinks, tone }))
}

/**
 * One series drawn as a line across the categories: through the middle of
 * each slot, broken where a row has none, and past four readings to a pixel
 * through the points the pixels show, `columns` the device pixels across.
 * Straight between the category centers, since there is nothing between two
 * categories for a curve to claim.
 */
export const barLinePath = (
  one: Series,
  slot: number,
  y: Scale,
  sideways: boolean,
  columns: number,
): string =>
  unbroken(one)
    .map((run) => {
      const points = columnPoints(
        run.map((point): Point => [point.at * slot + slot / 2, y(point.value)]),
        columns,
        PLOT_WIDTH,
      )
      return linePath(
        sideways ? points.map(([across, along]): Point => [along, across]) : points,
        'straight',
      )
    })
    .join('')

/**
 * Where the bubble for the category at `at` of `count` stands: off the far
 * end of its tallest column, measured on `reach`, so it never covers the
 * columns it describes, or of its stack under `stacked`. Bars grow away from
 * their names, so a sideways bubble stands to the right, or to the left on a
 * mirrored drawing.
 */
export const barTip = (
  reached: readonly number[],
  asked: { readonly mirrored: boolean; readonly sideways: boolean; readonly stacked: boolean },
  reach: Scale,
  at: number,
  count: number,
): { placement: 'left' | 'right' | 'top'; x: string; y: string } => {
  const values = asked.stacked ? stackEnds([reached]) : reached
  const ends = (values.length > 0 ? values : [0]).map((one) => reach(one))
  const far = asked.sideways ? Math.max(...ends) : Math.min(...ends)
  const slot = 100 / count
  const across = at * slot + slot / 2
  return {
    placement: asked.sideways ? (asked.mirrored ? 'left' : 'right') : 'top',
    x: asked.sideways ? `${far}%` : `${across}%`,
    y: asked.sideways ? `${across}%` : `${far}%`,
  }
}

/** Two decimals, as a phone's column is written, more than a 100 unit view box shows. */
const near = (value: number): number => Math.round(value * 100) / 100

/**
 * One column as a phone draws it, which has no clip to round a rect with: its
 * outline as a path, its far end rounded where it is a far end, and its edge,
 * the same outline open at its base, which `outlined` and `subtle` stroke.
 * `radius` is the corner in the drawing's units across and along a stretched
 * plot, so the corner is round on the screen, and `inset` half the edge's
 * stroke, by which the edge stands inside the column, as the web's clip keeps
 * only the half of the stroke inside it.
 */
export const barOutline = (
  box: ColumnBox,
  column: { readonly end: StackEnd | undefined; readonly stacked: boolean },
  sideways: boolean,
  radius: { readonly x: number; readonly y: number },
  inset: { readonly x: number; readonly y: number } = { x: 0, y: 0 },
): { d: string; edge: string } => {
  const below = column.end === 'negative'
  const rounded = !(column.stacked && column.end === undefined)
  /* In the column's own frame: `w` across, `h` along, the far end at the
     top. Each point is turned onto the drawing's axes as it is written. */
  const [w, h] = [box.thickness, box.size]
  const [ru, rv] = sideways ? [radius.y, radius.x] : [radius.x, radius.y]
  const [iu, iv] = sideways ? [inset.y, inset.x] : [inset.x, inset.y]
  const u = rounded ? Math.min(ru, w / 2) : 0
  const v = rounded ? Math.min(rv, h) : 0
  /* A point at `a` across and `b` up from the base, on the drawing's axes:
     up is toward a smaller y for a column, a larger x for a bar, and the other
     way for a column below zero. */
  const at = (a: number, b: number): string => {
    const along = below
      ? sideways
        ? box.along + box.size - b
        : box.along + b
      : sideways
        ? box.along + b
        : box.along + box.size - b
    const across = box.across + a
    return sideways ? `${near(along)},${near(across)}` : `${near(across)},${near(along)}`
  }
  /* Each corner turns the way the outline does: clockwise on the screen
     from the base to the far end, and the other way below zero. */
  const sweep = below ? 0 : 1
  const arc = (a: number, b: number): string =>
    u > 0 && v > 0
      ? `A${near(sideways ? v : u)},${near(sideways ? u : v)} 0 0 ${sweep} ${at(a, b)}`
      : `L${at(a, b)}`
  const outline = (a0: number, a1: number, top: number): string =>
    `${at(a0, 0)}L${at(a0, top - v)}${arc(a0 + u, top)}L${at(a1 - u, top)}${arc(a1, top - v)}L${at(a1, 0)}`
  const edge = h - iv > 0 && w - 2 * iu > 0 ? `M${outline(iu, w - iu, h - iv)}` : ''
  return { d: `M${outline(0, w, h)}Z`, edge }
}

/** The band behind the category at `at` of `count`, the slot the pointer rests in. */
export const barBand = (
  at: number,
  count: number,
  sideways: boolean,
): { height: number; width: number; x: number; y: number } => {
  const slot = 100 / count
  return sideways
    ? { height: slot, width: 100, x: 0, y: at * slot }
    : { height: 100, width: slot, x: at * slot, y: 0 }
}

/** Each series' highest reading, the first of the highest where two tie. */
export const barHighest = (one: Series): SeriesPoint | undefined => {
  let best: SeriesPoint | undefined
  for (const point of one.points) {
    if (best === undefined || point.value > best.value) {
      best = point
    }
  }
  return best
}
