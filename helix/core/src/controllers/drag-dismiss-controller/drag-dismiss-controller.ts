import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { reducedMotion } from '../../utils/page-motion/page-motion.js'
import {
  edgeOffset,
  exitGlide,
  type Glide,
  resisted,
  type SwipeEdge,
  settleGlide,
  settleSwipe,
  swipeAxis,
  towardEdge,
} from '../../utils/swipe/swipe.js'
import { SwipeController } from '../swipe-controller/swipe-controller.js'

/**
 * Where a drag moves the surface freely, as travel toward its edge in pixels.
 * Past either end it meets resistance.
 */
export interface DragBounds {
  /** The most travel before resistance, such as the resting point of a drawer that refuses to close. */
  max: number

  /** The least travel before resistance: `0` is the surface fully shown. */
  min: number
}

/** What a release tells the host that decides what it means. */
export interface DragRelease {
  /** The surface's size along the drag, in pixels. */
  size: number

  /** How far toward its edge the surface is drawn, in pixels, from fully shown. */
  travel: number

  /** How fast it was moving toward its edge, in pixels per millisecond, negative away from it. */
  velocity: number
}

/** What a `DragDismissController` reads of its host, and what it tells it. */
export interface DragDismissOptions {
  /**
   * Where the surface moves freely, given its size along the drag. The surface
   * fully shown to anywhere off its edge where this is not given.
   */
  bounds?: (size: number) => DragBounds

  /**
   * Whether a release dismisses. A host with resting points of its own moves
   * its rest here before it answers no, as a drawer settles on a snap point.
   * Where this is not given, a release dismisses past half the surface's size
   * or at a fling, as `settleSwipe` reads one.
   */
  decide?: (release: DragRelease) => boolean

  /**
   * The host's own way out, called once a release dismisses, which returns
   * whether it went ahead. A host whose page refused it, by canceling its
   * before-close event, answers false and the surface goes back to rest.
   */
  dismiss: () => boolean

  /** The edge the surface leaves through, or `undefined` while it cannot be dragged. */
  edge: () => SwipeEdge | undefined

  /**
   * Called once a release has come to rest, on or off the screen, with
   * whether it dismissed. A host that holds back part of its close until the
   * glide has gone, such as taking a dialog out of the top layer, does it
   * here. The dragging state is still on while it runs.
   */
  landed?: (dismissed: boolean) => void

  /** Records the dragging state on the host, from the drag's start until its release lands. */
  mark?: (dragging: boolean) => void

  /**
   * Called each time a drag or a release moves the surface, with how far toward
   * its edge it is drawn and its size, for a host that publishes the distance,
   * such as a drawer fading its backdrop.
   */
  moved?: (travel: number, size: number) => void

  /**
   * How far toward its edge the host's own stylesheet already rests the
   * surface, in pixels, such as a drawer at a snap point. The surface is moved
   * by the difference. `0` where this is not given.
   */
  rest?: () => number

  /** Whether a press, on the element it landed on, may start a drag. */
  start?: (target: Element, event: PointerEvent) => boolean

  /** The element a drag starts on: a handle, or the whole surface. */
  surface: () => HTMLElement | null | undefined

  /**
   * Whether a drag `dx` and `dy` from the press moves the surface, asked
   * until one does: a drawer's list keeps a drag it scrolls, and the surface
   * stays where it rests for the rest of the press. Every drag moves it where
   * this is not given.
   */
  takes?: (dx: number, dy: number) => boolean

  /** The element that moves, where it is not the surface. */
  target?: () => HTMLElement | null | undefined

  /**
   * How long a release takes and the curve it settles back on, as the host's
   * family hooks hold them, such as `--drawer-release-duration` and
   * `--drawer-release-easing`. Read at each release. A duration that is empty,
   * or under a millisecond, glides nothing.
   */
  timing: () => { duration: string; easing: string }
}

/** A release in flight. */
interface Flight {
  course: Glide
  dismissed: boolean
  frame: number
  /** When the release happened, on `performance.now()`'s clock. */
  start: number
}

/** How many steps a curve is read in. 48 lands on every point of a `linear()` written in twelfths, as the spring token is. */
const STEPS = 48

/**
 * A timing function's progress at `STEPS + 1` evenly spaced points, read by
 * the browser, so a `linear()` spring is followed exactly as a transition
 * would draw it: an animation with no keyframes moves nothing, and paused at a
 * time it reports the curve's progress there, as `CountController`'s clock
 * does.
 */
const readCurve = (element: HTMLElement, easing: string): number[] => {
  let clock: Animation
  try {
    clock = element.animate([], { duration: 1000, easing, fill: 'both' })
  } catch {
    /* Not a timing function the browser reads, which `animate` refuses. */
    return [0, 1]
  }
  clock.pause()
  const curve: number[] = []
  for (let step = 0; step <= STEPS; step += 1) {
    clock.currentTime = (step / STEPS) * 1000
    const progress = clock.effect?.getComputedTiming().progress
    curve.push(typeof progress === 'number' ? progress : step / STEPS)
  }
  clock.cancel()
  return curve
}

/** Reads a duration as milliseconds. Anything that does not read as one is 0. */
const milliseconds = (value: string): number => {
  const amount = Number.parseFloat(value)
  if (!Number.isFinite(amount)) {
    return 0
  }
  return value.trim().endsWith('ms') ? amount : amount * 1000
}

/** A length for `translate`, to the hundredth of a pixel. */
const px = (value: number): string => `${Math.round(value * 100) / 100 || 0}px`

/**
 * Drags a surface along one axis toward the edge it leaves through, and on the
 * release dismisses it or puts it back, at the speed it was let go: a toast
 * swiped away, a drawer dragged closed.
 *
 * **The surface follows the finger.** `SwipeController` decides that a press is
 * a drag, once it has gone 8 pixels mostly along the axis, so a tap on a
 * button inside is still a tap and a drag across is the page's scroll. Then
 * the surface takes the pointer and moves with it one to one, through an
 * inline `translate` on top of whatever its stylesheet does, and past the open
 * end, or past `bounds`, it meets resistance and moves less and less. The
 * `translate` is there only while a drag and its release run: at rest the
 * surface carries none.
 *
 * **The release keeps the speed.** A fling dismisses from any distance, a slow
 * drag past half the surface dismisses, and anything else goes back. Going,
 * the surface leaves at the speed it was let go, gathering pace where that was
 * slow, off the edge of the window. Going back, it follows the host's curve,
 * `--helix-easing-spring` on the styled tier, with the release's speed carried
 * in, so neither stalls nor jumps at the moment the finger lifts. A drag that
 * starts while it goes back catches it where it is.
 *
 * **The host's own way out decides.** `dismiss` is the host's close, so its
 * events fire as they do for every other way out, a cancelable one included.
 * A refusal puts the surface back.
 *
 * **Under reduced motion the drag still follows the finger**, since moving
 * something with your hand is not motion that starts by itself, and the
 * release does not glide: the surface goes or goes back at once. The headless
 * tier sets no timing, so a release lands at once there too.
 *
 * While it can be dragged, the surface carries `data-drags` with its axis,
 * which `DRAGS_RULE` turns into a `touch-action` that leaves the page only the
 * other pan. Name `DRAGS_RULE` in the host's `markRules`.
 */
export class DragDismissController implements ReactiveController {
  private readonly options: DragDismissOptions

  /** The edge, held from the start of a drag to its landing. */
  private edge: SwipeEdge = 'right'

  /** The surface's size along the drag, measured as it starts. */
  private size = 0

  /** The travel the finger's distance is counted from. */
  private base = 0

  /** Where the drag has taken the surface, before resistance. */
  private raw = 0

  /** Whether a finger is dragging the surface now. */
  private held = false

  /** Whether a drag or its release is under way, from the first move to the landing. */
  private active = false

  /** The release in flight. */
  private flight: Flight | undefined

  /** Whether a dismissed surface still carries the `translate` it left on. */
  private left = false

  constructor(host: ReactiveControllerHost & HTMLElement, options: DragDismissOptions) {
    this.options = options
    /* Follows the pointer, and says when a press is a drag. It adds itself to
       the host, which is all that holds it. */
    new SwipeController(host, {
      axis: () => {
        const edge = this.options.edge()
        return edge && !this.flight?.dismissed ? swipeAxis(edge) : undefined
      },
      cancel: () => this.release(undefined),
      capture: true,
      end: (dx, dy, vx, vy) => this.release({ dx, dy, vx, vy }),
      move: (dx, dy) => this.drag(dx, dy),
      ...(options.start ? { start: options.start } : {}),
      surface: options.surface,
    })
    host.addController(this)
  }

  /** Whether a drag or its release is under way. */
  get dragging(): boolean {
    return this.active
  }

  hostUpdated(): void {
    const surface = this.options.surface()
    if (!surface) {
      return
    }
    const edge = this.options.edge()
    const axis = edge ? swipeAxis(edge) : undefined
    if (axis === undefined) {
      surface.removeAttribute('data-drags')
    } else if (surface.getAttribute('data-drags') !== axis) {
      surface.setAttribute('data-drags', axis)
    }
    /* A surface that left by a drag comes back without its last `translate`
       once it can be dragged again, such as a drawer opened again. */
    if (axis !== undefined && this.left && !this.active) {
      this.left = false
      this.target?.style.removeProperty('translate')
    }
  }

  hostDisconnected(): void {
    this.held = false
    if (this.active) {
      this.land(this.flight?.dismissed ?? false)
    }
  }

  private get target(): HTMLElement | null | undefined {
    return this.options.target?.() ?? this.options.surface()
  }

  private get rest(): number {
    return this.options.rest?.() ?? 0
  }

  /** Where the surface is drawn, with resistance past its bounds. */
  private get travel(): number {
    const bounds = this.options.bounds?.(this.size) ?? { max: Number.POSITIVE_INFINITY, min: 0 }
    return resisted(this.raw, bounds.min, bounds.max, this.size)
  }

  private drag(dx: number, dy: number): void {
    const edge = this.options.edge()
    if (!edge) {
      return
    }
    if (!this.held && this.options.takes && !this.options.takes(dx, dy)) {
      return
    }
    if (!this.held) {
      /* Caught on its way back: the drag carries on from where it is drawn,
         with no jump to where the finger came down. */
      const caught = this.flight ? this.raw : undefined
      this.halt()
      this.held = true
      this.edge = edge
      const box = this.target?.getBoundingClientRect()
      this.size = (swipeAxis(edge) === 'x' ? box?.width : box?.height) ?? 0
      this.base = caught === undefined ? this.rest : caught - towardEdge(edge, dx, dy)
      if (!this.active) {
        this.active = true
        this.options.mark?.(true)
      }
    }
    this.raw = this.base + towardEdge(this.edge, dx, dy)
    this.draw()
  }

  /** Moves the surface to where the drag has taken it. */
  private draw(): void {
    const travel = this.travel
    const target = this.target
    if (target) {
      const { x, y } = edgeOffset(this.edge, travel - this.rest)
      target.style.translate = `${px(x)} ${px(y)}`
    }
    this.options.moved?.(travel, this.size)
  }

  /** A release, or with nothing a cancel, which goes back to rest. */
  private release(moved: { dx: number; dy: number; vx: number; vy: number } | undefined): void {
    if (!this.held) {
      return
    }
    this.held = false
    if (!moved) {
      this.glideTo(false, 0)
      return
    }
    this.raw = this.base + towardEdge(this.edge, moved.dx, moved.dy)
    const velocity = towardEdge(this.edge, moved.vx, moved.vy)
    const release = { size: this.size, travel: this.travel, velocity }
    const decided = this.options.decide
      ? this.options.decide(release)
      : settleSwipe({ points: [1], ...release }) === 0
    this.glideTo(decided && this.options.dismiss(), velocity)
  }

  /** How far toward its edge the surface has to go to be off the window. */
  private exit(): number {
    const travel = this.travel
    const box = this.target?.getBoundingClientRect()
    const room =
      box && typeof window !== 'undefined'
        ? {
            bottom: window.innerHeight - box.top,
            left: box.right,
            right: window.innerWidth - box.left,
            top: box.bottom,
          }[this.edge]
        : undefined
    return room !== undefined && Number.isFinite(room)
      ? travel + Math.max(0, room)
      : Math.max(travel, this.size)
  }

  /**
   * Glides the surface from where it is to its end: off the window when it was
   * dismissed, and back to rest along the host's curve when not.
   *
   * **Timed from the release, each frame**, so the first frame after it has
   * already moved on at the release's speed, where an animation left to play
   * would hold still until the frame it started on.
   */
  private glideTo(dismissed: boolean, velocity: number): void {
    /* The new rest at once, so a host that moved it, a drawer settling on a
       snap point, is never drawn a frame at the new rest with the old offset. */
    this.draw()
    const target = this.target
    const from = this.raw
    const to = dismissed ? this.exit() : this.rest
    const timing = this.options.timing()
    const longest = milliseconds(timing.duration)
    if (
      longest < 1 ||
      reducedMotion() ||
      !target ||
      typeof target.animate !== 'function' ||
      typeof requestAnimationFrame !== 'function'
    ) {
      this.land(dismissed)
      return
    }
    const course = dismissed
      ? exitGlide(from, to, velocity, longest)
      : settleGlide(from, to, velocity, longest, readCurve(target, timing.easing.trim() || 'ease'))
    const flight: Flight = { course, dismissed, frame: 0, start: performance.now() }
    this.flight = flight
    const step = (): void => {
      if (this.flight !== flight) {
        return
      }
      const elapsed = performance.now() - flight.start
      if (elapsed >= course.duration) {
        this.raw = to
        this.draw()
        this.land(dismissed)
        return
      }
      this.raw = course.at(elapsed)
      this.draw()
      flight.frame = requestAnimationFrame(step)
    }
    flight.frame = requestAnimationFrame(step)
  }

  /** Stops a release in flight where it is. */
  private halt(): void {
    const flight = this.flight
    this.flight = undefined
    if (flight) {
      cancelAnimationFrame(flight.frame)
    }
  }

  /**
   * Brings a release to rest: the host finishes its part first, with the
   * dragging state still on, so nothing it does is caught by a transition.
   * A surface that went back loses its `translate`. One that went keeps it
   * until it can be dragged again, so a message still fading does not jump
   * back into its place.
   */
  private land(dismissed: boolean): void {
    this.halt()
    if (!dismissed) {
      this.raw = this.rest
    }
    this.options.landed?.(dismissed)
    const target = this.target
    if (target) {
      /* The host's last change is styled now, while the dragging state still
         turns every transition off, and the `translate` goes after it. */
      void getComputedStyle(target).translate
      if (!dismissed) {
        target.style.removeProperty('translate')
      }
    }
    this.left = dismissed
    this.active = false
    this.options.mark?.(false)
  }
}
