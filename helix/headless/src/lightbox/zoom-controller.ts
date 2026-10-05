import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { between, clampPan, clampScale, type Offset, spread, zoomAt } from './zoom.js'

export interface ZoomOptions {
  /** The most the item may grow, as a scale. 1 or less turns zooming off. */
  max: () => number

  /** Told every time the scale or the position changes. */
  onChange: (scale: number, pan: Offset) => void

  /** The box the item is shown in, which presses must land in and the item scales from the middle of. */
  surface: () => HTMLElement | null | undefined
}

/**
 * Pinch, double press and drag to zoom into the item a viewer shows, and to
 * move about it once zoomed.
 *
 * Two fingers scale the item about the point between them. A double press, a
 * double click or a double tap, zooms all the way in about the point pressed,
 * and back out again. One pointer dragged across a zoomed item moves it, never
 * so far that an edge comes inside the box. What it reports is a scale and an
 * offset from the middle of the box; drawing them is the caller's.
 */
export class ZoomController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly options: ZoomOptions

  /** The pointers down on the box, where each one is now. */
  private readonly pointers = new Map<number, Offset>()

  /** What the gesture under way started from. */
  private from: { at: Offset; pan: Offset; scale: number; spread: number } | undefined

  /** The scale, 1 at rest. */
  scale = 1

  /** How far the item is moved from the middle of the box, in pixels. */
  pan: Offset = { x: 0, y: 0 }

  /**
   * Whether two fingers have been down since the last gesture began, so a
   * swipe that started with the first of them can be told it was a pinch.
   */
  pinched = false

  constructor(host: ReactiveControllerHost & HTMLElement, options: ZoomOptions) {
    this.host = host
    this.options = options
    host.addController(this)
  }

  /** Whether the item is zoomed, or two fingers are on it: either way, a drag is not a swipe. */
  get engaged(): boolean {
    return this.scale > 1 || this.pointers.size > 1
  }

  hostConnected(): void {
    this.host.addEventListener('pointerdown', this.handleDown)
    this.host.addEventListener('dblclick', this.handleDouble)
  }

  hostDisconnected(): void {
    this.host.removeEventListener('pointerdown', this.handleDown)
    this.host.removeEventListener('dblclick', this.handleDouble)
    this.release()
  }

  /** Zooms to `scale` about the middle of the box, held to the range. */
  zoomTo(scale: number, at: Offset = { x: 0, y: 0 }): void {
    const next = clampScale(scale, this.options.max())
    this.set(next, zoomAt(at, this.scale, next, this.pan))
  }

  /** Back to the item at its own size, in the middle. */
  reset(): void {
    if (this.scale !== 1 || this.pan.x !== 0 || this.pan.y !== 0) {
      this.set(1, { x: 0, y: 0 })
    }
  }

  private set(scale: number, pan: Offset): void {
    const box = this.options.surface()?.getBoundingClientRect()
    const held = clampPan(pan, scale, box?.width ?? 0, box?.height ?? 0)
    if (scale === this.scale && held.x === this.pan.x && held.y === this.pan.y) {
      return
    }
    this.scale = scale
    this.pan = held
    this.options.onChange(scale, held)
  }

  /** A point on the page, measured from the middle of the box. */
  private offset(event: { clientX: number; clientY: number }): Offset {
    const box = this.options.surface()?.getBoundingClientRect()
    return {
      x: event.clientX - (box ? box.left + box.width / 2 : 0),
      y: event.clientY - (box ? box.top + box.height / 2 : 0),
    }
  }

  /** Whether a press landed in the box, through slotted content as well. */
  private inside(event: Event): boolean {
    const surface = this.options.surface()
    return surface !== null && surface !== undefined && event.composedPath().includes(surface)
  }

  /** Starts over from where every pointer down is now. */
  private begin(): void {
    const [a, b] = [...this.pointers.values()]
    if (!a) {
      this.from = undefined
      return
    }
    this.from = {
      at: b ? between(a, b) : a,
      pan: { ...this.pan },
      scale: this.scale,
      spread: b ? spread(a, b) : 0,
    }
  }

  private readonly handleDown = (event: PointerEvent): void => {
    if (this.options.max() <= 1 || event.button !== 0 || !this.inside(event)) {
      return
    }
    if (this.pointers.size === 0) {
      this.pinched = false
      window.addEventListener('pointermove', this.handleMove)
      window.addEventListener('pointerup', this.handleUp)
      window.addEventListener('pointercancel', this.handleUp)
    }
    this.pointers.set(event.pointerId, this.offset(event))
    if (this.pointers.size > 1) {
      this.pinched = true
    }
    this.begin()
  }

  private readonly handleMove = (event: PointerEvent): void => {
    const from = this.from
    if (!from || !this.pointers.has(event.pointerId)) {
      return
    }
    this.pointers.set(event.pointerId, this.offset(event))
    const [a, b] = [...this.pointers.values()]
    if (a && b && from.spread > 0) {
      const at = between(a, b)
      const scale = clampScale((from.scale * spread(a, b)) / from.spread, this.options.max())
      const about = zoomAt(from.at, from.scale, scale, from.pan)
      this.set(scale, { x: about.x + at.x - from.at.x, y: about.y + at.y - from.at.y })
    } else if (a && this.scale > 1) {
      this.set(this.scale, { x: from.pan.x + a.x - from.at.x, y: from.pan.y + a.y - from.at.y })
    }
  }

  private readonly handleUp = (event: PointerEvent): void => {
    if (!this.pointers.delete(event.pointerId)) {
      return
    }
    if (this.pointers.size === 0) {
      this.release()
      return
    }
    this.begin()
  }

  /** A double press zooms all the way in about the point, or back out. */
  private readonly handleDouble = (event: MouseEvent): void => {
    if (this.options.max() <= 1 || !this.inside(event)) {
      return
    }
    if (this.scale > 1) {
      this.reset()
    } else {
      this.zoomTo(this.options.max(), this.offset(event))
    }
  }

  private release(): void {
    window.removeEventListener('pointermove', this.handleMove)
    window.removeEventListener('pointerup', this.handleUp)
    window.removeEventListener('pointercancel', this.handleUp)
    this.pointers.clear()
    this.from = undefined
  }
}
