import type { ReactiveController, ReactiveControllerHost } from 'lit'
import type { SwipeAxis } from '../../utils/swipe/swipe.js'

/** How far a press has to travel before it is a swipe, in pixels, by default. */
const SLOP = 8

/**
 * How far back the speed at a release is read, in milliseconds. Long enough to
 * smooth over one uneven reading, and short enough that a finger which slowed
 * before it lifted is let go slowly.
 */
const RECENT = 100

export interface SwipeOptions {
  /** The axis a swipe is read along, or `undefined` while swiping is off. */
  axis: () => SwipeAxis | undefined

  /**
   * Called when the browser takes a swipe over for a scroll of its own. Where
   * it is not given, `end` is called with nothing moved, which puts a host that
   * reads distance back where it began.
   */
  cancel?: () => void

  /**
   * Whether the surface takes the pointer once a press becomes a swipe, so
   * every move and the release come to it wherever the pointer goes. The
   * capture is let go at the release and on a cancel.
   */
  capture?: boolean

  /**
   * Called on the release, with how far the pointer went and how fast it was
   * going, in pixels per millisecond, on each axis, over its last 100
   * milliseconds. A pointer that stood still for that long before it lifted
   * was going nowhere.
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
 * swipe that started on a button does not also press it. The swallow is held on
 * the window for one task after the release, so a spec that swipes and then
 * presses a control in the same task sees that press swallowed: wait a task
 * between them, as a reader's next press always does.
 *
 * The move and the release are heard on the window, so a pointer that leaves
 * the surface mid-swipe is still followed.
 */
export class SwipeController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly options: SwipeOptions

  /** Where the press began, while one is down. */
  private origin: Sample | undefined

  /** The readings of the last `RECENT` milliseconds, for the speed. */
  private samples: Sample[] = []

  /** The surface holding the pointer, where `capture` asked it to take it. */
  private captured: HTMLElement | undefined

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
      const surface = this.options.surface()
      surface?.setAttribute('data-swiping', '')
      if (this.options.capture && surface) {
        /* A pointer the browser no longer counts as down, such as one a
           script made up, cannot be captured, and the window still hears it. */
        try {
          surface.setPointerCapture(event.pointerId)
          this.captured = surface
        } catch {
          this.captured = undefined
        }
      }
    }
    const at = { t: event.timeStamp, x: event.clientX, y: event.clientY }
    this.samples = [...this.samples.filter((one) => at.t - one.t <= RECENT), at]
    this.options.move(dx, dy)
  }

  private readonly handleUp = (event: PointerEvent): void => {
    const origin = this.origin
    if (!origin || event.pointerId !== this.pointer) {
      return
    }
    const swiped = this.swiping
    /* Over the last `RECENT` milliseconds, the release included, so a pointer
       that stood still before it lifted was going nowhere. */
    const at = { t: event.timeStamp, x: event.clientX, y: event.clientY }
    const first = [...this.samples, at].find((one) => at.t - one.t <= RECENT)
    const elapsed = first ? at.t - first.t : 0
    const vx = first && elapsed > 0 ? (at.x - first.x) / elapsed : 0
    const vy = first && elapsed > 0 ? (at.y - first.y) / elapsed : 0
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
    if (!swiped) {
      return
    }
    if (this.options.cancel) {
      this.options.cancel()
    } else {
      this.options.end(0, 0, 0, 0)
    }
  }

  /** Forgets the press, lets go of the pointer, and stops listening for it. */
  private stop(): void {
    window.removeEventListener('pointermove', this.handleMove)
    window.removeEventListener('pointerup', this.handleUp)
    window.removeEventListener('pointercancel', this.handleCancel)
    const captured = this.captured
    const pointer = this.pointer
    this.captured = undefined
    if (captured && pointer !== undefined && captured.hasPointerCapture?.(pointer)) {
      captured.releasePointerCapture(pointer)
    }
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
