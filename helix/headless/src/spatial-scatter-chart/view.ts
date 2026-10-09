/**
 * A spatial chart's box as SVG, seen from a camera that turns and tilts: its
 * edges, a grid at the ticks on its floor and two walls, and where its
 * numbers and its measures' names stand. Shared by the spatial scatter and
 * the spatial surface, which draw their own readings inside it.
 *
 * Kept apart from the elements because it is arithmetic a picture hides: a
 * tick drawn at the wrong place reads as a number the data never had.
 *
 * **The box is two units on every side**, from -1 to 1, as the three.js
 * driver's is, so the same reading stands at the same place in either
 * drawing. Across is the floor's across, up is the height, and in depth runs
 * toward the viewer, which is the way back from the floor's back.
 */

import {
  type Camera,
  type PagePoint,
  type Projection,
  pathData,
  projectionOf,
  shortNumber,
} from '@fusion.dev/helix-core'
import { type SVGTemplateResult, svg } from 'lit'
import type { PlotAxis } from './field.js'

/**
 * Where a spatial chart's SVG drawing is seen from until it is turned: from
 * the front right and a little above, about where the three.js driver's
 * camera starts, so a renderer that takes over does not swing the view.
 */
export const SPATIAL_VIEW: Camera = { tilt: 25, turn: 42 }

/** How far one step of Shift with an arrow turns or tilts the view, in degrees, as the renderer's. */
export const VIEW_STEP = 15

/** A place in the box: across, up, and in depth, each from -1 to 1. */
export type BoxPoint = readonly [number, number, number]

/** A number or a name written in the drawing, where it stands on the page. */
export interface ViewLabel {
  /** Whether it is a measure's name, drawn stronger, rather than a tick's number. */
  name: boolean
  text: string
  x: number
  y: number
}

/** The box as the camera sees it. */
export interface BoxView {
  /** The box every line, label, and reading fits in, on the page: its left, top, width, and height. */
  bounds: { height: number; width: number; x: number; y: number }
  /** The box's edges and its grid, as one path. */
  grid: string
  labels: ViewLabel[]
  /** A place in the box, on the page. */
  on(point: BoxPoint): PagePoint
  /** How near the camera a place in the box stands: the larger, the nearer. */
  depth(point: BoxPoint): number
  projection: Projection
}

/** Where a number stands in the box, from -1 at its axis' low end to 1 at its high end. */
export const inBox = (axis: PlotAxis, value: number): number => {
  const [low, high] = axis.range
  return high === low ? 0 : ((value - low) / (high - low)) * 2 - 1
}

/** A number on an axis, written short enough for a tick. */
export const tickText = (value: number): string => String(Number(value.toPrecision(6)))

/** How wide a label is on the page, as a share of its size, which is near enough to fit the box around it. */
const WIDE = 0.58

/** How large a tick's number and a measure's name are, on the page, in the box's units. */
export const TICK_SIZE = 0.13
export const NAME_SIZE = 0.15

/**
 * The box for `axes`, seen from `camera`, and the readings' own places on
 * the page, which `extra` adds to the bounds.
 */
export const boxView = (
  axes: { x: PlotAxis; y: PlotAxis; z: PlotAxis },
  camera: Camera,
  extra: readonly PagePoint[] = [],
): BoxView => {
  const projection = projectionOf(camera)
  /* Across stays across, up is the height, and in depth comes toward the
     viewer, which is the floor's back turned round. */
  const on = ([x, y, z]: BoxPoint): PagePoint => projection.at(x, -z, y)
  const depth = ([x, , z]: BoxPoint): number => projection.depth(x, -z)
  const lines: string[] = []
  const line = (from: BoxPoint, to: BoxPoint): void => {
    const [a, b] = [on(from), on(to)]
    lines.push(`M${shortNumber(a.x)} ${shortNumber(a.y)}L${shortNumber(b.x)} ${shortNumber(b.y)}`)
  }
  for (const a of [-1, 1]) {
    for (const b of [-1, 1]) {
      line([-1, a, b], [1, a, b])
      line([a, -1, b], [a, 1, b])
      line([a, b, -1], [a, b, 1])
    }
  }
  /* The grid on the floor and on the two walls at the back, as the three.js
     driver draws it. */
  for (const tick of axes.x.ticks) {
    const x = inBox(axes.x, tick)
    line([x, -1, -1], [x, -1, 1])
    line([x, -1, -1], [x, 1, -1])
  }
  for (const tick of axes.z.ticks) {
    const z = inBox(axes.z, tick)
    line([-1, -1, z], [1, -1, z])
    line([-1, -1, z], [-1, 1, z])
  }
  for (const tick of axes.y.ticks) {
    const y = inBox(axes.y, tick)
    line([-1, y, -1], [1, y, -1])
    line([-1, y, -1], [-1, y, 1])
  }
  const labels: ViewLabel[] = []
  const label = (at: BoxPoint, text: string, name = false): void => {
    labels.push({ name, text, ...on(at) })
  }
  for (const tick of axes.x.ticks) {
    label([inBox(axes.x, tick), -1, 1.14], tickText(tick))
  }
  for (const tick of axes.z.ticks) {
    label([1.14, -1, inBox(axes.z, tick)], tickText(tick))
  }
  /* The up axis' lowest tick is the floor, at the corner the across axis'
     first number already takes, so it is left to the floor's grid. */
  for (const tick of axes.y.ticks.slice(1)) {
    label([-1.14, inBox(axes.y, tick), 1], tickText(tick))
  }
  label([0, -1, 1.38], axes.x.name, true)
  label([1.6, -1, 0], axes.z.name, true)
  label([-1, 1.28, 1], axes.y.name, true)
  /* The bounds hold every line, every label at about its width, and every
     reading, so nothing is cut at the edge of the drawing. */
  const corners: PagePoint[] = []
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      for (const z of [-1, 1]) {
        corners.push(on([x, y, z]))
      }
    }
  }
  for (const one of labels) {
    const size = one.name ? NAME_SIZE : TICK_SIZE
    const half = (one.text.length * size * WIDE) / 2
    corners.push({ x: one.x - half, y: one.y - size }, { x: one.x + half, y: one.y + size })
  }
  corners.push(...extra)
  const xs = corners.map((point) => point.x)
  const ys = corners.map((point) => point.y)
  const [left, top] = [Math.min(...xs), Math.min(...ys)]
  return {
    bounds: { height: Math.max(...ys) - top, width: Math.max(...xs) - left, x: left, y: top },
    depth,
    grid: lines.join(''),
    labels,
    on,
    projection,
  }
}

/** A place on the page as a share of the bounds, from their top left, for a mark the tooltip points at. */
export const shareOf = (view: BoxView, point: PagePoint): { x: number; y: number } => ({
  x: (point.x - view.bounds.x) / view.bounds.width,
  y: (point.y - view.bounds.y) / view.bounds.height,
})

/** Path data for a closed shape through `points`. */
export const shape = (points: readonly PagePoint[]): string => pathData(points)

/** The next view after a step of Shift with an arrow, held between the lowest tilt and straight above. */
export const turned = (camera: Camera, across: number, up: number): Camera => ({
  tilt: Math.min(Math.max(camera.tilt + up * VIEW_STEP, 15), 90),
  turn: camera.turn + across * VIEW_STEP,
})

/** The box's grid, its numbers, and its measures' names, drawn first so every reading stands in front of them. */
export const drawBox = (view: BoxView): SVGTemplateResult =>
  svg`<path d=${view.grid} part="grid"></path>${view.labels.map((label) =>
    label.name
      ? svg`<text dominant-baseline="central" font-size=${NAME_SIZE} part="axis-name" text-anchor="middle" x=${shortNumber(label.x)} y=${shortNumber(label.y)}>${label.text}</text>`
      : svg`<text dominant-baseline="central" font-size=${TICK_SIZE} part="tick" text-anchor="middle" x=${shortNumber(label.x)} y=${shortNumber(label.y)}>${label.text}</text>`,
  )}`

/** A reading drawn on the page, which the pointer finds. */
export interface Placed {
  index: number
  x: number
  y: number
}

/**
 * The reading drawn nearest the pointer, within `reach` pixels of it, or
 * `-1`. **Measured on the screen**, through the drawing's own transform, so
 * a small point is found from as far as a large one, at any size the
 * drawing is shown.
 */
export const nearestTo = (
  drawing: SVGSVGElement | null | undefined,
  event: PointerEvent,
  places: readonly Placed[],
  reach = 14,
): number => {
  const matrix = drawing?.getScreenCTM?.()
  if (!matrix) {
    return -1
  }
  let found = -1
  let distance = reach
  for (const place of places) {
    const x = matrix.a * place.x + matrix.c * place.y + matrix.e
    const y = matrix.b * place.x + matrix.d * place.y + matrix.f
    const away = Math.hypot(x - event.clientX, y - event.clientY)
    if (away < distance) {
      distance = away
      found = place.index
    }
  }
  return found
}
