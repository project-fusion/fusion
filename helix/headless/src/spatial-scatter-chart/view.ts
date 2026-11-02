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
  type BoxAxisText,
  boxLabels,
  type Camera,
  type PagePoint,
  type Projection,
  pathData,
  projectionOf,
  shortNumber,
} from '@fusion.dev/helix-core'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
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

/** A number on an axis, written short enough for a tick. */
export const tickText = (value: number): string => String(Number(value.toPrecision(6)))

/** How wide a label is on the page, as a share of its size, which is near enough to fit the box around it. */
const WIDE = 0.58

/** How large a tick's number and a measure's name are, on the page, in the box's units. */
export const TICK_SIZE = 0.13
export const NAME_SIZE = 0.15

/** The space between an edge and its numbers, and between the numbers and the name, in the box's units. */
const LABEL_GAP = 0.06

/**
 * The box for `axes`, seen from `camera`, and the readings' own places on
 * the page, which `extra` adds to the bounds.
 */
export const boxView = (
  axes: { extent?: BoxExtent | undefined; x: PlotAxis; y: PlotAxis; z: PlotAxis },
  camera: Camera,
  extra: readonly PagePoint[] = [],
  bare = false,
  words = 1,
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
        text: label ?? tickText(tick),
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

/**
 * The view whose ticks stand at the box's font size or larger on the page.
 *
 * The drawing scales through its `viewBox`, so a tick written in the box's units
 * shrinks with the box: measured October 2026 at 390 wide, 7.4 pixels on Scatter
 * and Surface, under the 12 of the box's own font. The words widen the frame they
 * are measured on, so the measure runs again on what they widened. Where nothing
 * has measured the box, as on a server, the words stay at their written size.
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
    view = draw(Math.min(MOST_WORDS, Math.max(1, (room.font * pixel) / TICK_SIZE)))
  }
  return view
}

/** Keeps a chart told the size and font size of the box its own drawing fills. */
export class PlotRoomWatch implements ReactiveController {
  room: PlotRoom | undefined

  private box: Element | undefined

  private sizes: ResizeObserver | undefined

  constructor(private readonly host: ReactiveControllerHost & HTMLElement) {
    host.addController(this)
  }

  hostUpdated(): void {
    const box = this.host.shadowRoot?.querySelector('[part="fallback"]')
    if (!box || box === this.box || typeof ResizeObserver !== 'function') {
      return
    }
    this.box = box
    this.sizes?.disconnect()
    this.sizes = new ResizeObserver(([entry]) => {
      const { height, width } = entry?.contentRect ?? { height: 0, width: 0 }
      const font = Number.parseFloat(getComputedStyle(box).fontSize) || 16
      const was = this.room
      if (was?.width !== width || was.height !== height || was.font !== font) {
        this.room = height > 0 && width > 0 ? { font, height, width } : undefined
        this.host.requestUpdate()
      }
    })
    this.sizes.observe(box)
  }

  hostDisconnected(): void {
    this.sizes?.disconnect()
    this.sizes = undefined
    this.box = undefined
  }
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

/** The box's grid, its numbers, and its measures' names, drawn first so every reading stands in front of them. */
export const drawBox = (view: BoxView): SVGTemplateResult =>
  svg`<path d=${view.grid} part="grid"></path>${view.labels.map((label) =>
    label.name
      ? svg`<text dominant-baseline="central" font-size=${NAME_SIZE * view.words} part="axis-name" text-anchor="middle" x=${shortNumber(label.x)} y=${shortNumber(label.y)}>${label.text}</text>`
      : svg`<text dominant-baseline="central" font-size=${TICK_SIZE * view.words} part="tick" text-anchor="middle" x=${shortNumber(label.x)} y=${shortNumber(label.y)}>${label.text}</text>`,
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

/** How far a drag turns the view, in degrees for each pixel across, and tilts it for each pixel down, as the graph's isometric diagram does. */
const TURN_PER_PIXEL = 0.5
const TILT_PER_PIXEL = 0.35

/** How far a press moves before it is a drag, in pixels, which a click never does. */
const DRAG = 4

/** How long the drawing takes to settle into its frame once a drag ends, in milliseconds, as long as the renderer's turn. */
const SETTLE = 250

/** The part of the page a drawing shows, as its `viewBox`: its left, top, width, and height. */
export interface Frame {
  height: number
  width: number
  x: number
  y: number
}

/** The time now, in milliseconds. */
const now = (): number => globalThis.performance?.now() ?? Date.now()

/** Fast at first and slow to rest. */
const easeOut = (t: number): number => 1 - (1 - t) ** 3

/**
 * A drag across a spatial chart's own drawing, which turns its view as the
 * pointer moves: across turns it, and down tilts it. **A press that moves
 * less than a few pixels is a press**, so a click still puts the reading on
 * a point, and the click that ends a drag is the drag's: `dragged` says so,
 * for the chart to keep it from pressing anything.
 *
 * **The drawing turns in place.** Through a drag, `frame` holds the drawing
 * at the size it had when the drag began, with the middle of the data where
 * it stood, as the renderer's camera turns round its target. The drawing
 * may reach past its edges as it turns, and nothing on the page moves. Once
 * the drag ends, it settles into the frame that fits it.
 *
 * A touch turns the view when it moves across, and the page's stylesheet
 * leaves a touch moving up and down to scroll the page.
 */
export class DragTurn {
  private held: { id: number; moved: boolean; x: number; y: number } | undefined

  /** The frame and the middle of the data, as the last render drew them. */
  private last: { frame: Frame; middle: PagePoint } | undefined

  /** The frame held through a drag, and where the middle of the data stands in it. */
  private kept: { frame: Frame; middle: PagePoint } | undefined

  /** The frame a drag ended on, and when it ended, while the drawing settles. */
  private settling: { from: Frame; start: number } | undefined

  /** Whether the press that ended last was a drag. */
  dragged = false

  /**
   * `turn` moves the view, and `redraw` asks for a render, which `frame`
   * needs once a drag ends and on each step as the drawing settles.
   */
  constructor(
    private readonly turn: (next: (camera: Camera) => Camera) => void,
    private readonly redraw: () => void,
  ) {}

  /** Whether a drag is moving the view now. */
  get moving(): boolean {
    return this.held?.moved === true
  }

  down(event: PointerEvent): void {
    this.dragged = false
    this.held =
      event.button === 0
        ? { id: event.pointerId, moved: false, x: event.clientX, y: event.clientY }
        : undefined
  }

  /** Turns the view for a drag, and says whether the event was one. */
  move(event: PointerEvent): boolean {
    const held = this.held
    if (!held || held.id !== event.pointerId) {
      return false
    }
    const dx = event.clientX - held.x
    const dy = event.clientY - held.y
    if (!held.moved && Math.hypot(dx, dy) < DRAG) {
      return false
    }
    if (!held.moved) {
      held.moved = true
      /* Captured where the browser still tracks the pointer, so a drag that
         leaves the drawing keeps going. */
      try {
        ;(event.currentTarget as Element | null)?.setPointerCapture?.(event.pointerId)
      } catch {
        /* Nothing to capture. */
      }
    }
    held.x = event.clientX
    held.y = event.clientY
    this.turn((camera) => ({
      tilt: Math.min(Math.max(camera.tilt + dy * TILT_PER_PIXEL, 15), 90),
      turn: camera.turn - dx * TURN_PER_PIXEL,
    }))
    return true
  }

  /** Ends a press, and says whether it was a drag. */
  up(event: PointerEvent): boolean {
    const held = this.held
    if (!held || held.id !== event.pointerId) {
      return false
    }
    this.held = undefined
    this.dragged = held.moved
    if (held.moved) {
      this.redraw()
    }
    return held.moved
  }

  /**
   * The frame to draw in, given the one that fits the drawing now and where
   * the middle of the data stands on the page. Called on every render.
   */
  frame(fits: Frame, middle: PagePoint): Frame {
    let shown = fits
    if (this.moving) {
      this.settling = undefined
      const from = this.last ?? { frame: fits, middle }
      this.kept ??= {
        frame: from.frame,
        middle: { x: from.middle.x - from.frame.x, y: from.middle.y - from.frame.y },
      }
      const { frame, middle: at } = this.kept
      shown = { height: frame.height, width: frame.width, x: middle.x - at.x, y: middle.y - at.y }
    } else if (this.kept) {
      this.kept = undefined
      const still = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
      this.settling = still || !this.last ? undefined : { from: this.last.frame, start: now() }
    }
    if (this.settling && !this.moving) {
      const { from, start } = this.settling
      const t = (now() - start) / SETTLE
      if (t >= 1) {
        this.settling = undefined
      } else {
        const k = easeOut(Math.max(0, t))
        const toward = (a: number, b: number): number => a + (b - a) * k
        shown = {
          height: toward(from.height, fits.height),
          width: toward(from.width, fits.width),
          x: toward(from.x, fits.x),
          y: toward(from.y, fits.y),
        }
        globalThis.requestAnimationFrame?.(() => this.redraw())
      }
    }
    this.last = { frame: shown, middle }
    return shown
  }

  /** Keeps the click that ends a drag from pressing a reading. */
  readonly click = (event: Event): void => {
    if (this.dragged) {
      this.dragged = false
      event.stopPropagation()
      event.preventDefault()
    }
  }
}
