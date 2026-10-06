import type { ReactiveController, ReactiveControllerHost } from 'lit'
import type { SwipeAxis } from '../../utils/swipe/swipe.js'

/** How far a press has to travel before it is a swipe, in pixels, by default. */
const SLOP = 8

export interface SwipeOptions {
  /** The axis a swipe is read along, or `undefined` while swiping is off. */
  axis: () => SwipeAxis | undefined

  /**
   * Called on the release, with how far the pointer went and how fast it was
   * going, in pixels per millisecond, on each axis.
   */
  end: (dx: number, dy: number, vx: number, vy: number) => void

  /** Called as the pointer moves, with how far it has gone from the press. */
  move: (dx: number, dy: number) => void

  /**
   * How far a press travels before it is a swipe, in pixels: 8 where this is
   * not given. A mouse drag that takes over sooner, such as Carousel's at 4,
   * says so here.
   */
  slop?: number

  /**
   * Whether a press may start a swipe, given the element it landed on. Every
   * press may where this is not given. A field, a scroller that has its own use
   * for the drag, or a mouse where dragging selects text, says no.
   */
  start?: (target: Element, event: PointerEvent) => boolean

  /** The element a swipe starts on, which carries `data-swiping` while one runs. */
  surface: () => HTMLElement | null | undefined
}

/** One reading of the pointer, for the speed at the release. */
interface Sample {
  t: number
  x: number
  y: number
}

/**
 * Follows a pointer dragged across a surface along one axis, for a surface the
 * reader swipes away or along: a drawer, a toast, a lightbox's pictures.
 *
 * It decides only that a swipe is happening and reports where the pointer is.
 * What a swipe means is the host's, which is why `move` and `end` are told the
 * distance and nothing else: a drawer settles it against snap points, a toast
 * against half its width, and a lightbox turns it into next or previous.
 *
 * **A press is a swipe only once it has moved `SLOP` pixels, mostly along the
 * axis.** Before that it is still a press, so a tap on a button inside the
 * surface is a tap, and a drag across the axis, a reader scrolling, is left to
 * the page. Once it is a swipe, the click that ends it is swallowed, so a
 * swipe that started on a button does not also press it.
 *
 * The move and the release are heard on the window, so a pointer that leaves
 * the surface mid-swipe is still followed.
 */
export class SwipeController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly options: SwipeOptions

  /** Where the press began, while one is down. */
  private origin: Sample | undefined

  /** The last two readings, for the speed. */
  private samples: Sample[] = []

  /** Whether the press has become a swipe. */
  private swiping = false

  /** The pointer being followed. */
  private pointer: number | undefined

  constructor(host: ReactiveControllerHost & HTMLElement, options: SwipeOptions) {
    this.host = host
    this.options = options
    host.addController(this)
  }

  hostConnected(): void {
    this.host.addEventListener('pointerdown', this.handleDown)
  }

  hostDisconnected(): void {
    this.host.removeEventListener('pointerdown', this.handleDown)
    this.stop()
  }

  private readonly handleDown = (event: PointerEvent): void => {
    const surface = this.options.surface()
    const path = event.composedPath()
    const target = path[0]
    /* On the surface in the flattened tree: the path, and not `contains`, so a
       press on content slotted into it counts. */
    if (
      event.button !== 0 ||
      this.options.axis() === undefined ||
      !surface ||
      !(target instanceof Element) ||
      !path.includes(surface) ||
      (this.options.start && !this.options.start(target, event))
    ) {
      return
    }
    this.pointer = event.pointerId
    this.origin = { t: event.timeStamp, x: event.clientX, y: event.clientY }
    this.samples = [this.origin]
    this.swiping = false
    window.addEventListener('pointermove', this.handleMove)
    window.addEventListener('pointerup', this.handleUp)
    window.addEventListener('pointercancel', this.handleCancel)
  }

  private readonly handleMove = (event: PointerEvent): void => {
    const origin = this.origin
    const axis = this.options.axis()
    if (!origin || event.pointerId !== this.pointer || axis === undefined) {
      return
    }
    const dx = event.clientX - origin.x
    const dy = event.clientY - origin.y
    if (!this.swiping) {
      const along = Math.abs(axis === 'x' ? dx : dy)
      const across = Math.abs(axis === 'x' ? dy : dx)
      if (Math.max(along, across) < (this.options.slop ?? SLOP)) {
        return
      }
      if (across >= along) {
        this.stop()
        return
      }
      this.swiping = true
      this.options.surface()?.setAttribute('data-swiping', '')
    }
    this.samples = [
      ...this.samples.slice(-1),
      { t: event.timeStamp, x: event.clientX, y: event.clientY },
    ]
    this.options.move(dx, dy)
  }

  private readonly handleUp = (event: PointerEvent): void => {
    const origin = this.origin
    if (!origin || event.pointerId !== this.pointer) {
      return
    }
    const swiped = this.swiping
    const [before, last] = [this.samples[0], this.samples[this.samples.length - 1]]
    const elapsed = before && last ? last.t - before.t : 0
    const vx = before && last && elapsed > 0 ? (last.x - before.x) / elapsed : 0
    const vy = before && last && elapsed > 0 ? (last.y - before.y) / elapsed : 0
    this.stop()
    if (!swiped) {
      return
    }
    /* The click a release raises lands on whatever the press began on. */
    window.addEventListener('click', swallow, { capture: true, once: true })
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0)
    this.options.end(event.clientX - origin.x, event.clientY - origin.y, vx, vy)
  }

  /** A swipe the browser took over, for a scroll of its own, goes back to where it began. */
  private readonly handleCancel = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointer) {
      return
    }
    const swiped = this.swiping
    this.stop()
    if (swiped) {
      this.options.end(0, 0, 0, 0)
    }
  }

  /** Forgets the press and stops listening for it. */
  private stop(): void {
    window.removeEventListener('pointermove', this.handleMove)
    window.removeEventListener('pointerup', this.handleUp)
    window.removeEventListener('pointercancel', this.handleCancel)
    this.options.surface()?.removeAttribute('data-swiping')
    this.origin = undefined
    this.pointer = undefined
    this.samples = []
    this.swiping = false
  }
}

const swallow = (event: Event): void => {
  event.preventDefault()
  event.stopPropagation()
}
