/**
 * A spatial chart's box drawn in SVG by Lit, and the pointer on it: the
 * drawing, the size of the box it fills, the reading nearest a pointer, and
 * a drag that turns the view. The box itself, as numbers, is core's, which a
 * phone's drawing reads too, and is given on from here for the spatial
 * charts that import it.
 */

import type { Camera, PagePoint } from '@fusion.dev/helix-core'
import { shortNumber } from '@fusion.dev/helix-core'
import {
  type BoxView,
  DRAG,
  dragged,
  NAME_SIZE,
  type PlotRoom,
  TICK_SIZE,
} from '@fusion.dev/helix-core/spatial'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { type SVGTemplateResult, svg } from 'lit'

export {
  type BoxExtent,
  type BoxPoint,
  type BoxView,
  boundsOf,
  boxView,
  inBox,
  NAME_SIZE,
  type PlotRoom,
  SPATIAL_VIEW,
  shape,
  shareOf,
  TICK_SIZE,
  tickText,
  turned,
  VIEW_STEP,
  type ViewLabel,
  wordsFitted,
} from '@fusion.dev/helix-core/spatial'

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
        /* **On the next frame, not in this one.** The words the new room sizes
           can move the box this observer watches, and a change made inside the
           callback raised a resize loop in about half of the runs once the words
           could shrink as well as grow. */
        requestAnimationFrame(() => this.host.requestUpdate())
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
    this.turn((camera) => dragged(camera, dx, dy))
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
