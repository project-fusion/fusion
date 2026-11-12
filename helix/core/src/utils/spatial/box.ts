import { type BoxAxisText, boxLabels } from '../box-labels/box-labels.js'
import { formatNumbers } from '../format-numbers/format-numbers.js'
import {
  type Camera,
  type PagePoint,
  type Projection,
  pathData,
  projectionOf,
  shortNumber,
} from '../projection/projection.js'
import type { PlotAxis } from './field.js'

/*
 * A spatial chart's box, seen from a camera that turns and tilts, as numbers:
 * its edges, a grid at the ticks on its floor and two walls, and where its
 * numbers and its measures' names stand. The web's elements draw it in SVG,
 * and a phone draws the same box in react-native-svg, so both stand every
 * reading at one place.
 *
 * Kept apart from the drawings because it is arithmetic a picture hides: a
 * tick drawn at the wrong place reads as a number the data never had.
 *
 * **The box is two units on every side**, from -1 to 1, as the three.js
 * driver's is, so the same reading stands at the same place in either
 * drawing. Across is the floor's across, up is the height, and in depth runs
 * toward the viewer, which is the way back from the floor's back.
 */

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

/**
 * How long the box is along each axis, across, up, and in depth, as a share
 * of the cube's: `[1, 1, 1]` where a chart does not say, and less along an
 * axis whose grid is shorter, as a bar chart of one series is a long, low
 * row. A place in the box is still from -1 to 1 along each.
 */
export type BoxExtent = readonly [number, number, number]

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
  /** How large the words are, as a share of `TICK_SIZE` and `NAME_SIZE`. */
  words: number
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

/**
 * A number on an axis, written short enough for a tick and grouped in
 * `locale` as the flat charts write theirs, such as `3,000`: the runtime's own
 * locale where it is empty. Negative zero is written as zero.
 */
export const tickText = (value: number, locale = ''): string =>
  formatNumbers(locale)(Number(value.toPrecision(6)) || 0)

/** How wide a label is on the page, as a share of its size, which is near enough to fit the box around it. */
const WIDE = 0.58

/** How large a tick's number and a measure's name are, on the page, in the box's units. */
export const TICK_SIZE = 0.13
export const NAME_SIZE = 0.15

/** The space between an edge and its numbers, and between the numbers and the name, in the box's units. */
const LABEL_GAP = 0.06

/**
 * The box for `axes`, seen from `camera`, and the readings' own places on
 * the page, which `extra` adds to the bounds. Its numbers are written in
 * `locale`.
 */
export const boxView = (
  axes: { extent?: BoxExtent | undefined; x: PlotAxis; y: PlotAxis; z: PlotAxis },
  camera: Camera,
  extra: readonly PagePoint[] = [],
  bare = false,
  words = 1,
  locale = '',
): BoxView => {
  const projection = projectionOf(camera)
  const [ex, ey, ez] = axes.extent ?? [1, 1, 1]
  /* Across stays across, up is the height, and in depth comes toward the
     viewer, which is the floor's back turned round, each scaled to the box. */
  const on = ([x, y, z]: BoxPoint): PagePoint => projection.at(x * ex, -z * ez, y * ey)
  const depth = ([x, , z]: BoxPoint): number => projection.depth(x * ex, -z * ez)
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
  for (const tick of axes.x.rules ?? axes.x.ticks) {
    const x = inBox(axes.x, tick)
    line([x, -1, -1], [x, -1, 1])
    line([x, -1, -1], [x, 1, -1])
  }
  for (const tick of axes.z.rules ?? axes.z.ticks) {
    const z = inBox(axes.z, tick)
    line([-1, -1, z], [1, -1, z])
    line([-1, -1, z], [-1, 1, z])
  }
  for (const tick of axes.y.rules ?? axes.y.ticks) {
    const y = inBox(axes.y, tick)
    line([-1, y, -1], [1, y, -1])
    line([-1, y, -1], [-1, y, 1])
  }
  /* Along the edges that face the reader, which a turn changes. */
  const text = (axis: PlotAxis): BoxAxisText => ({
    name: axis.name,
    ticks: axis.ticks.map((tick, index) => {
      const label = axis.labels?.[index]
      return {
        at: inBox(axis, tick),
        /* A label with a number in it, such as a date, reads from the labels beside it. */
        category: label !== undefined && !/\d/.test(label),
        text: label ?? tickText(tick, locale),
      }
    }),
  })
  /* A bare box writes nothing along its edges. */
  const labels: ViewLabel[] = bare
    ? []
    : boxLabels(
        (point) => ({ ...on(point), depth: depth(point) }),
        { x: text(axes.x), y: text(axes.y), z: text(axes.z) },
        { gap: LABEL_GAP * words, name: NAME_SIZE * words, tick: TICK_SIZE * words, wide: WIDE },
      )
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
    const size = (one.name ? NAME_SIZE : TICK_SIZE) * words
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
    grid: bare ? '' : lines.join(''),
    labels,
    on,
    projection,
    words,
  }
}

/** The drawing's box on the page, and the font size its words are measured against. */
export interface PlotRoom {
  font: number
  height: number
  width: number
}

/** How many times the words are measured, each pass on the frame the last one widened. */
const WORD_PASSES = 4

/** The most the words grow, which holds them to a size where the box still shows. */
const MOST_WORDS = 3

/** The least the words shrink to, in a box drawn so large a tick would be a speck. */
const FEWEST_WORDS = 0.25

/**
 * The view whose ticks stand at the box's font size on the page.
 *
 * The drawing scales through its `viewBox`, so a tick written in the box's units
 * shrinks with the box: measured October 2026 at 390 wide, 7.4 pixels on Scatter
 * and Surface, under the 12 of the box's own font. **And it grows with the box**,
 * so the words are held to the font size from above as well as from below:
 * measured November 4, 2026 at 640 wide, Treemap's ticks drew at 15.4 and its
 * axis name at 17.8, against 12 and 13.8 on Surface beside it. The words widen
 * the frame they are measured on, so the measure runs again on what they
 * widened. Where nothing has measured the box, as on a server, the words stay
 * at their written size.
 */
export const wordsFitted = (
  room: PlotRoom | undefined,
  draw: (words: number) => BoxView,
): BoxView => {
  let view = draw(1)
  if (!room) {
    return view
  }
  for (let pass = 0; pass < WORD_PASSES; pass += 1) {
    const pixel = 1 / Math.min(room.width / view.bounds.width, room.height / view.bounds.height)
    view = draw(Math.min(MOST_WORDS, Math.max(FEWEST_WORDS, (room.font * pixel) / TICK_SIZE)))
  }
  return view
}

/**
 * The part of the page that holds `points`, `pad` beyond them on every side:
 * the frame of a drawing with no box, which fits its readings alone.
 */
export const boundsOf = (points: readonly PagePoint[], pad: number): BoxView['bounds'] => {
  if (points.length === 0) {
    return { height: 2 * pad, width: 2 * pad, x: -pad, y: -pad }
  }
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const [left, top] = [Math.min(...xs) - pad, Math.min(...ys) - pad]
  return {
    height: Math.max(...ys) + pad - top,
    width: Math.max(...xs) + pad - left,
    x: left,
    y: top,
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

/** How far a drag turns the view, in degrees for each pixel across, and tilts it for each pixel down, as the graph's isometric diagram does. */
export const TURN_PER_PIXEL = 0.5
export const TILT_PER_PIXEL = 0.35

/** How far a press moves before it is a drag, in pixels, which a click never does. */
export const DRAG = 4

/** The view after a drag of `dx` pixels across and `dy` down, held between the lowest tilt and straight above. */
export const dragged = (camera: Camera, dx: number, dy: number): Camera => ({
  tilt: Math.min(Math.max(camera.tilt + dy * TILT_PER_PIXEL, 15), 90),
  turn: camera.turn - dx * TURN_PER_PIXEL,
})
