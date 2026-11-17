import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { reducedMotion } from '../../utils/page-motion/page-motion.js'

/** What a `LayoutMotionController` reads of its host. */
export interface LayoutMotionOptions {
  /** Every item that can move, in the order they are drawn. Read at every change. */
  items: () => readonly HTMLElement[]

  /**
   * How long a move takes and its curve, as the host's family hooks hold them,
   * such as `--list-move-duration` and `--list-move-easing`. Read at every
   * change. A duration that is empty, or under a millisecond, moves nothing.
   */
  timing: () => { duration: string; easing: string }
}

/** Where an item's box sits inside its host, in the host's layout pixels. */
interface Place {
  x: number
  y: number
}

/** A move in flight: the offset it started from, so the offset it shows now can be worked out. */
interface Flight {
  animation: Animation
  from: Place
}

/** How far a box arrives from, in pixels, before it settles in its place. */
const ARRIVAL = 6

/** Reads a duration as milliseconds. Anything that does not read as one is 0. */
const milliseconds = (value: string): number => {
  const amount = Number.parseFloat(value)
  if (!Number.isFinite(amount)) {
    return 0
  }
  return value.trim().endsWith('ms') ? amount : amount * 1000
}

/**
 * The host's on-screen size over its layout size, for each axis.
 *
 * A difference of a pixel or less is `offsetWidth`'s rounding and counts as no
 * scale, as `IndicatorController` counts it.
 */
const scaleOf = (host: HTMLElement, box: DOMRect): Place => {
  const along = (drawn: number, laid: number): number =>
    laid > 0 && Math.abs(drawn - laid) > 1 ? drawn / laid : 1
  return { x: along(box.width, host.offsetWidth), y: along(box.height, host.offsetHeight) }
}

/**
 * Moves each item from where it was drawn to where it is drawn after a change,
 * so a row that is added, sorted, hidden or closed up slides into its place
 * instead of jumping there.
 *
 * **The change is heard, not announced.** The items of a list or a group are
 * the page's children, which the page or its framework adds, removes and
 * reorders on its own, so no update of the host comes before the change. A
 * `MutationObserver` hears children arrive, leave and change `hidden`, and
 * each item's place before the change is the one recorded after the last
 * change, after a resize of the host, or when the host connected.
 *
 * **A move interrupted by another starts from where the item is drawn.** The
 * offset a move in flight is showing is worked out from its eased progress and
 * added to the place it was heading for, so a second sort mid-slide carries on
 * from the screen with no jump back.
 *
 * **The stylesheet decides whether anything moves.** The timing is the host
 * family's own hooks, which `timing` reads by name so each family publishes
 * the hooks it reads. The styled tier sets them from the duration and easing
 * tokens, and the page can set them on the element. The headless tier sets
 * neither, so it never moves until the page does. **Reduced motion stops every move**, whatever the
 * properties say, because a page that writes a literal duration has not
 * answered the reader's setting.
 *
 * **Places are layout pixels inside the host.** A box measured on screen is
 * divided by the host's scale, because a move is written as a translation in
 * the item's own pixels, and a list inside a scaled preview would otherwise
 * travel the scale's share too far. Inside the host, so a page that scrolls
 * while a row moves does not move its start.
 *
 * **An item that arrives fades in, unless every item is new.** A framework
 * that renders the whole list again with new elements has replaced it rather
 * than added to it, and the whole list arriving at once would be a flash.
 * The items there when the host connected arrive with the page, and do not
 * fade.
 *
 * Only `transform` and `opacity` are animated, so a move never sets off
 * layout, and each animation is composited onto the item's own transform.
 */
export class LayoutMotionController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly options: LayoutMotionOptions

  /** Where each item was drawn after the last change. Empty until the first record. */
  private places = new Map<HTMLElement, Place>()

  /** Whether the host has been measured once, so a change after that is a change. */
  private recorded = false

  /** The moves in flight, by item. */
  private readonly flights = new WeakMap<HTMLElement, Flight>()

  private mutations: MutationObserver | undefined

  private resizes: ResizeObserver | undefined

  constructor(host: ReactiveControllerHost & HTMLElement, options: LayoutMotionOptions) {
    this.host = host
    this.options = options
    host.addController(this)
  }

  hostConnected(): void {
    if (typeof MutationObserver !== 'undefined') {
      this.mutations ??= new MutationObserver((records) => this.heard(records))
      this.mutations.observe(this.host, {
        attributeFilter: ['hidden'],
        childList: true,
        subtree: true,
      })
    }
    if (typeof ResizeObserver !== 'undefined') {
      /* Fires once on observing, which is the first record. */
      this.resizes ??= new ResizeObserver(() => this.record())
      this.resizes.observe(this.host)
    }
  }

  hostDisconnected(): void {
    this.mutations?.disconnect()
    this.resizes?.disconnect()
    this.places = new Map()
    this.recorded = false
  }

  /** Whether a set of records changed the items: one arriving or leaving, or turning `hidden`. */
  private heard(records: readonly MutationRecord[]): void {
    const changed = records.some((one) =>
      one.type === 'childList' ? one.target === this.host : one.target.parentNode === this.host,
    )
    if (changed) {
      this.move()
    }
  }

  /** Records where every item is drawn now, with no move started. */
  private record(): void {
    this.places = this.measure().now
    this.recorded = true
  }

  /**
   * Where each drawn item is laid out now, and the offset each move in flight
   * is showing on top of that. An item with no box, `hidden` or in a closed
   * subtree, has no place.
   */
  private measure(): { now: Map<HTMLElement, Place>; showing: Map<HTMLElement, Place> } {
    const now = new Map<HTMLElement, Place>()
    const showing = new Map<HTMLElement, Place>()
    const frame = this.host.getBoundingClientRect()
    const scale = scaleOf(this.host, frame)
    for (const item of this.options.items()) {
      if (item.getClientRects().length === 0) {
        continue
      }
      const box = item.getBoundingClientRect()
      const offset = this.offset(item)
      showing.set(item, offset)
      now.set(item, {
        x: (box.left - frame.left) / scale.x - offset.x,
        y: (box.top - frame.top) / scale.y - offset.y,
      })
    }
    return { now, showing }
  }

  /** The translation a move in flight is drawing on an item now, from its eased progress. */
  private offset(item: HTMLElement): Place {
    const flight = this.flights.get(item)
    const progress = flight?.animation.effect?.getComputedTiming().progress
    if (!flight || typeof progress !== 'number' || flight.animation.playState !== 'running') {
      return { x: 0, y: 0 }
    }
    return { x: flight.from.x * (1 - progress), y: flight.from.y * (1 - progress) }
  }

  /** Slides every item that moved from where it was drawn to where it is now. */
  private move(): void {
    const before = this.places
    const recorded = this.recorded
    const { now, showing } = this.measure()
    this.places = now
    this.recorded = true
    const timing = this.options.timing()
    const duration = milliseconds(timing.duration)
    if (!recorded || duration < 1 || reducedMotion()) {
      return
    }
    const easing = timing.easing.trim() || 'ease'
    const replaced = [...now.keys()].every((item) => !before.has(item))
    for (const [item, place] of now) {
      const was = before.get(item)
      if (!was) {
        if (!replaced) {
          this.arrive(item, duration, easing)
        }
        continue
      }
      const drawn = showing.get(item) ?? { x: 0, y: 0 }
      const from = { x: was.x + drawn.x - place.x, y: was.y + drawn.y - place.y }
      if (Math.abs(from.x) < 0.5 && Math.abs(from.y) < 0.5) {
        continue
      }
      this.flights.get(item)?.animation.cancel()
      const animation = item.animate(
        [{ transform: `translate(${from.x}px, ${from.y}px)` }, { transform: 'translate(0, 0)' }],
        { composite: 'add', duration, easing },
      )
      this.flights.set(item, { animation, from })
    }
  }

  /**
   * Fades in an item that was not drawn before the change, settling from a
   * little above its place.
   *
   * Two animations, because the fade replaces the item's opacity and the
   * settle adds to its transform: added, an opacity from 0 would start from
   * the item's own and never fade.
   */
  private arrive(item: HTMLElement, duration: number, easing: string): void {
    this.flights.get(item)?.animation.cancel()
    this.flights.delete(item)
    item.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing })
    item.animate([{ transform: `translate(0, ${-ARRIVAL}px)` }, { transform: 'translate(0, 0)' }], {
      composite: 'add',
      duration,
      easing,
    })
  }
}
