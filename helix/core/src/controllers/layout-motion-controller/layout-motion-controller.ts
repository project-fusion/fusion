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

  /**
   * Whether a set of records changed the items: one arriving or leaving the
   * host or another item, as a row does a tree's branch, or turning `hidden`.
   * A change inside an item, such as a streaming turn's text, is none.
   */
  private heard(records: readonly MutationRecord[]): void {
    const items = new Set<Node>(this.options.items())
    const changed = records.some((one) =>
      one.type === 'childList'
        ? one.target === this.host ||
          (items.has(one.target) &&
            ([...one.addedNodes].some((node) => items.has(node)) ||
              [...one.removedNodes].some((node) => this.places.has(node as HTMLElement))))
        : items.has(one.target) || one.target.parentNode === this.host,
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
   * Where each drawn item is laid out now, the offset the moves in flight are
   * showing on top of that, and the nearest item each one sits inside. An item
   * with no box, `hidden` or in a closed subtree, has no place.
   *
   * **The offset an item shows is its own move and every move around it**,
   * because an item inside another, as a tree's branch holds its rows, is
   * drawn wherever its parent's translation puts it.
   */
  private measure(): {
    now: Map<HTMLElement, Place>
    showing: Map<HTMLElement, Place>
    within: Map<HTMLElement, HTMLElement>
  } {
    const items = this.options.items()
    const all = new Set(items)
    const within = new Map<HTMLElement, HTMLElement>()
    for (const item of items) {
      for (let up = item.parentElement; up && up !== this.host; up = up.parentElement) {
        if (all.has(up)) {
          within.set(item, up)
          break
        }
      }
    }
    const showing = new Map<HTMLElement, Place>()
    const shown = (item: HTMLElement): Place => {
      const known = showing.get(item)
      if (known) {
        return known
      }
      const own = this.offset(item)
      const outer = within.get(item)
      const around = outer ? shown(outer) : { x: 0, y: 0 }
      const total = { x: own.x + around.x, y: own.y + around.y }
      showing.set(item, total)
      return total
    }
    const now = new Map<HTMLElement, Place>()
    const frame = this.host.getBoundingClientRect()
    const scale = scaleOf(this.host, frame)
    for (const item of items) {
      if (item.getClientRects().length === 0) {
        continue
      }
      const box = item.getBoundingClientRect()
      const offset = shown(item)
      now.set(item, {
        x: (box.left - frame.left) / scale.x - offset.x,
        y: (box.top - frame.top) / scale.y - offset.y,
      })
    }
    return { now, showing, within }
  }

  /** The translation an item's own move in flight is drawing now, from its eased progress. */
  private offset(item: HTMLElement): Place {
    const flight = this.flights.get(item)
    const progress = flight?.animation.effect?.getComputedTiming().progress
    if (!flight || typeof progress !== 'number' || flight.animation.playState !== 'running') {
      return { x: 0, y: 0 }
    }
    return { x: flight.from.x * (1 - progress), y: flight.from.y * (1 - progress) }
  }

  /**
   * Slides every item that moved from where it was drawn to where it is now.
   *
   * **An item inside another moves only by the difference.** Its parent's
   * translation already carries it, so its own starts from where it was drawn
   * less where its parent's starts, and the two run on one curve and add up to
   * its whole journey at every frame. An item that arrives inside another that
   * arrives fades in with it, and does not fade a second time.
   */
  private move(): void {
    const before = this.places
    const recorded = this.recorded
    const { now, showing, within } = this.measure()
    this.places = now
    this.recorded = true
    const timing = this.options.timing()
    const duration = milliseconds(timing.duration)
    if (!recorded || duration < 1 || reducedMotion()) {
      return
    }
    const easing = timing.easing.trim() || 'ease'
    const replaced = [...now.keys()].every((item) => !before.has(item))
    const journeys = new Map<HTMLElement, Place>()
    for (const [item, place] of now) {
      const was = before.get(item)
      if (was) {
        const drawn = showing.get(item) ?? { x: 0, y: 0 }
        journeys.set(item, { x: was.x + drawn.x - place.x, y: was.y + drawn.y - place.y })
      }
    }
    for (const item of now.keys()) {
      const outer = within.get(item)
      const journey = journeys.get(item)
      if (!journey) {
        const carried = outer !== undefined && now.has(outer) && !before.has(outer)
        if (!replaced && !carried) {
          this.arrive(item, duration, easing)
        }
        continue
      }
      const around = (outer && journeys.get(outer)) ?? { x: 0, y: 0 }
      const from = { x: journey.x - around.x, y: journey.y - around.y }
      this.flights.get(item)?.animation.cancel()
      this.flights.delete(item)
      if (Math.abs(from.x) < 0.5 && Math.abs(from.y) < 0.5) {
        continue
      }
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
