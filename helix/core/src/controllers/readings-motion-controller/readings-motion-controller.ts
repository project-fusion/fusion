import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { motionPaused, onMotionChange, reducedMotion } from '../../utils/page-motion/page-motion.js'
import { grownAt, growTime } from '../../utils/readings-motion/readings-motion.js'

/** One item of a chart's readings, as a `ReadingsMotionController` knows it. */
export interface MotionItem {
  /** What the item is known by from one table to the next, such as its category and its series. */
  key: string
  /** Its place in the order the chart grows in, such as its category's: items of one step grow together. */
  step: number
}

/** How far each item has come, which a chart's `between` draws its readings at. */
export interface MotionShares {
  /** How far the axes have come from where they were, from 0 to 1. */
  axes: number
  /**
   * Whether the item grows from the floor, whatever `from` holds for it: it
   * is growing in, and a change that came while it grew leaves it growing.
   */
  floor(key: string): boolean
  /**
   * How far the item has come, from 0 to 1: from its reading in `from`, or
   * from the floor, to its reading in `to`. For an item that `to` no longer
   * holds, how far it has gone from its reading in `from` to the floor.
   */
  share(key: string): number
}

/** What a `ReadingsMotionController` reads of its host. */
export interface ReadingsMotionOptions<F> {
  /**
   * The field `share` of the way between `from` and `to`, which the chart
   * draws this frame. `from` is `undefined` while the chart grows in, when
   * every item rises from the floor. **An item in both moves** from its old
   * reading to its new one, **an item only in `to` grows** from the floor,
   * and **an item only in `from` shrinks** to the floor, and is left out once
   * its share reaches 1. An item that cannot be matched, such as a cell of a
   * grid that changed shape, is drawn at its reading in `to`.
   */
  between: (from: F | undefined, to: F, at: MotionShares) => F

  /** Whether the chart grows in the first time it is seen: its `grow`. Read at every change. */
  grow: () => boolean

  /** Whether the chart grows in again each time it comes back into view: its `grow-again`. */
  growAgain: () => boolean

  /** Every item of a field, in the order the chart reads them. */
  items: (field: F) => readonly MotionItem[]

  /**
   * How long a change of readings takes and its curve, as the host's family
   * hooks hold them, such as `--spatial-bar-chart-move-duration` and
   * `--spatial-bar-chart-move-easing`. Read when a change starts. A duration
   * that is empty, or under a millisecond, moves nothing.
   */
  timing: () => { duration: string; easing: string }
}

/** Reads a duration as milliseconds. Anything that does not read as one is 0. */
const milliseconds = (value: string): number => {
  const amount = Number.parseFloat(value)
  if (!Number.isFinite(amount)) {
    return 0
  }
  return value.trim().endsWith('ms') ? amount : amount * 1000
}

/** An item growing in: when it started, and its place among the items that grow with it. */
interface Rising {
  since: number
  step: number
  steps: number
}

/** The items of `items` that grow, each by its key, ranked by step from 0, all starting at `since`. */
const risingOf = (items: readonly MotionItem[], since: number): Map<string, Rising> => {
  const ranks = new Map<number, number>()
  for (const item of items) {
    if (!ranks.has(item.step)) {
      ranks.set(item.step, ranks.size)
    }
  }
  return new Map(
    items.map((item) => [item.key, { since, step: ranks.get(item.step) ?? 0, steps: ranks.size }]),
  )
}

/**
 * Moves a chart's drawing from one set of readings to the next, so a chart
 * grows in the first time it is seen and follows new readings where they
 * would jump. Serves the spatial charts and `Heatmap`.
 *
 * **Growing in is a change from the floor.** Each item is known by a key,
 * such as its category and its series, and a new table is matched against
 * the readings drawn: an item in both moves from its old reading to its new
 * one, an item only in the new table grows from the floor, and an item that
 * left shrinks to the floor and then goes. The chart says how to draw a
 * field between two, in `between`, and draws what `drawn` gives it.
 *
 * **Two clocks.** Under `grow`, the chart's items wait flat on the floor
 * until 40% of the chart is in view, then grow in reading order, a step at
 * a time, on a curve of their own, whatever the stylesheet says, since the
 * page asked for the growth by name. A later table grows the items it adds
 * the same way. Every other change moves on the timing the host's family
 * hooks hold, which the styled tier sets from the tokens, so the headless
 * tier draws a new table at once until the page sets them. An animation
 * with no keyframes runs that curve, as `CountController`'s does.
 *
 * **A change that comes mid-move starts from what is drawn**, so a chart
 * fed a reading every second never jumps back to its last table first.
 *
 * **Nothing moves under `prefers-reduced-motion`**, or once the page has
 * paused its motion through `pauseMotion` or `Motion Toggle`, which also
 * ends a move in flight where it was heading. A server draws the readings
 * as they are.
 *
 * The host asks for an update on every frame through `requestUpdate`, and
 * calls `follow` with its readings before each render, or `relayout` where
 * only their layout changed, such as the columns a strip has room for.
 */
export class ReadingsMotionController<F> implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly options: ReadingsMotionOptions<F>

  /** The readings the host holds, the last given to `follow`. */
  private settled: F | undefined

  /** Whether the readings the host held before had anything to draw. */
  private readable = false

  /** Where the move in flight started: the readings drawn when it began, or `undefined` from the floor. */
  private from: F | undefined

  /** What is drawn this frame, while the readings move or wait on the floor. */
  private current: F | undefined

  /** Whether the readings wait on the floor to be seen before they grow. */
  private waiting = false

  /** Whether the first readings have been drawn, so a later table is not grown in again. */
  private grew = false

  /** Whether the move in flight is the chart growing in, after which `grow-again` waits for it to leave the view. */
  private entering = false

  /** The items growing in on the growth's own curve, by key. */
  private rising = new Map<string, Rising>()

  /** The items a new layout brought in during a move, which stand at their readings. */
  private standing = new Set<string>()

  /** The change in flight on the family's timing. */
  private clock: Animation | undefined

  /** Whether a frame is asked for. */
  private pending = false

  /** Whether the host is on the page, where an observer can watch it. */
  private connected = false

  /** Whether the chart has grown in under `grow-again`, so it waits to leave the view, on the page or once it comes back to it. */
  private exitWanted = false

  /** Whether a move was ended off the page, so the drawing stands partway until the host draws again. */
  private stale = false

  /** Watches for the chart to come into view, which starts it growing. */
  private seen: IntersectionObserver | undefined

  /** Watches for the chart to leave the view, after which `grow-again` grows it in once more. */
  private gone: IntersectionObserver | undefined

  private stopListening: (() => void) | undefined

  constructor(host: ReactiveControllerHost & HTMLElement, options: ReadingsMotionOptions<F>) {
    this.host = host
    this.options = options
    host.addController(this)
  }

  /** What the chart draws this frame: the readings between two tables, or its readings as they are. */
  get drawn(): F | undefined {
    return this.current ?? this.settled
  }

  /** Whether the readings drawn are not the ones the chart holds: moving, or waiting on the floor. */
  get moving(): boolean {
    return this.current !== undefined
  }

  hostConnected(): void {
    this.connected = true
    this.stopListening = onMotionChange((paused) => {
      if (paused) {
        this.rest()
      }
    })
    /* Moved on the page, it waits for its first sight again, or, once grown
       in, for the view to lose it. */
    if (this.waiting) {
      this.watchSight()
    } else if (this.exitWanted) {
      this.watchExit()
    }
    /* A move ended off the page left its last frame drawn partway. */
    if (this.stale) {
      this.stale = false
      this.host.requestUpdate()
    }
  }

  hostDisconnected(): void {
    this.connected = false
    this.stopListening?.()
    this.stopListening = undefined
    this.seen?.disconnect()
    this.seen = undefined
    this.gone?.disconnect()
    this.gone = undefined
    if (!this.waiting) {
      this.stale = this.current !== undefined || this.stale
      this.rest(false)
    }
  }

  /**
   * Takes the host's readings, and `readable`, whether they hold anything to
   * draw. Call it before each render: readings the same as the last do
   * nothing, so the field is best read once for each table.
   */
  follow(field: F, readable: boolean): void {
    if (field === this.settled) {
      return
    }
    const before = this.drawn
    const wasReadable = this.readable
    this.settled = field
    this.readable = readable
    if (!readable) {
      this.rest(false)
      return
    }
    if (this.options.grow() && !this.grew) {
      this.grew = true
      if (this.moves() && typeof IntersectionObserver === 'function') {
        this.wait()
      } else {
        this.rest(false)
      }
      return
    }
    if (this.waiting) {
      this.current = this.floorOf(field)
      return
    }
    if (!this.moves() || before === undefined || !wasReadable) {
      this.rest(false)
      return
    }
    const now = performance.now()
    const items = this.options.items(field)
    const kept = new Set(items.map((item) => item.key))
    /* An item that has finished growing moves on the clock from here, from
       the reading drawn, as every other item does. */
    for (const [key, one] of [...this.rising]) {
      if (!kept.has(key) || now - one.since >= growTime(one.steps)) {
        this.rising.delete(key)
      }
    }
    /* Under `grow`, the items the new table adds grow in as the first ones
       did, after one another, where the rest move on the family's timing. */
    if (this.options.grow()) {
      const had = new Set(this.options.items(before).map((item) => item.key))
      const added = items.filter((item) => !had.has(item.key) && !this.rising.has(item.key))
      for (const [key, one] of risingOf(added, now)) {
        this.rising.set(key, one)
      }
    }
    this.standing.clear()
    this.clock?.cancel()
    this.clock = this.startClock()
    if (!this.clock && this.rising.size === 0) {
      this.rest(false)
      return
    }
    this.from = before
    this.frame(now)
  }

  /**
   * Takes the host's readings laid out anew, such as at another width, where
   * the table itself has not changed: **a new layout is not a new reading**,
   * so nothing starts to move, and nothing grows in. A move in flight goes on
   * to the new layout, and an item the layout brings in that the move did not
   * start from stands at its reading. Readings that had nothing to draw before
   * are taken as `follow` takes them, so a chart laid out for the first time
   * still grows in.
   */
  relayout(field: F, readable: boolean): void {
    if (field === this.settled) {
      return
    }
    if (!this.readable || !readable) {
      this.follow(field, readable)
      return
    }
    this.settled = field
    if (this.waiting) {
      this.current = this.floorOf(field)
    } else if (this.current !== undefined) {
      const had = new Set(
        this.from === undefined ? [] : this.options.items(this.from).map((item) => item.key),
      )
      for (const item of this.options.items(field)) {
        if (!had.has(item.key) && !this.rising.has(item.key)) {
          this.standing.add(item.key)
        }
      }
      this.frame(performance.now())
    }
  }

  /** Whether anything may move: a browser that draws frames, a reader who has not asked for less movement, and a page that has not paused its motion. */
  private moves(): boolean {
    return typeof requestAnimationFrame === 'function' && !reducedMotion() && !motionPaused()
  }

  /** The field with every item on the floor. */
  private floorOf(field: F): F {
    return this.options.between(undefined, field, {
      axes: 1,
      floor: () => true,
      share: () => 0,
    })
  }

  /** The change's clock, on the family's timing, or `undefined` where the timing moves nothing. */
  private startClock(): Animation | undefined {
    const timing = this.options.timing()
    const duration = milliseconds(timing.duration)
    if (duration < 1 || typeof this.host.animate !== 'function') {
      return undefined
    }
    return this.host.animate([], { duration, easing: timing.easing.trim() || 'ease' })
  }

  /** How far the change's clock has come, from 0 to 1, or `undefined` with no clock. */
  private progress(): number | undefined {
    const clock = this.clock
    if (!clock) {
      return undefined
    }
    if (clock.playState === 'finished') {
      return 1
    }
    const progress = clock.effect?.getComputedTiming().progress
    return typeof progress === 'number' ? progress : 0
  }

  /** Puts every item on the floor and waits for the chart to be seen. */
  private wait(): void {
    const field = this.settled
    if (field === undefined) {
      return
    }
    this.clock?.cancel()
    this.clock = undefined
    this.rising.clear()
    this.standing.clear()
    this.from = undefined
    this.waiting = true
    this.current = this.floorOf(field)
    this.watchSight()
  }

  /** Starts the growth once 40% of the chart is in view. */
  private watchSight(): void {
    if (this.seen || typeof IntersectionObserver !== 'function') {
      return
    }
    this.seen = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || !this.waiting) {
          return
        }
        this.seen?.disconnect()
        this.seen = undefined
        const field = this.settled
        if (field === undefined || motionPaused()) {
          this.rest()
          return
        }
        this.waiting = false
        this.entering = true
        const now = performance.now()
        this.rising = risingOf(this.options.items(field), now)
        this.from = undefined
        this.frame(now)
      },
      { threshold: 0.4 },
    )
    this.seen.observe(this.host)
  }

  /** Under `grow-again`, waits for the chart to leave the view, then puts its items on the floor to grow in again. */
  private watchExit(): void {
    if (!this.options.growAgain() || typeof IntersectionObserver !== 'function') {
      this.exitWanted = false
      return
    }
    this.exitWanted = true
    /* Off the page, nothing is watched: `hostConnected` watches once the host is back. */
    if (this.gone || !this.connected) {
      return
    }
    this.gone = new IntersectionObserver(([entry]) => {
      if (!entry || entry.isIntersecting) {
        return
      }
      this.gone?.disconnect()
      this.gone = undefined
      this.exitWanted = false
      if (this.moves() && this.readable) {
        this.wait()
        this.host.requestUpdate()
      }
    })
    this.gone.observe(this.host)
  }

  /** Draws the frame at `now`, and asks for the next until every item stands. */
  private frame(now: number): void {
    const field = this.settled
    if (field === undefined) {
      return
    }
    const progress = this.progress()
    let rising = false
    for (const one of this.rising.values()) {
      if (now - one.since < growTime(one.steps)) {
        rising = true
        break
      }
    }
    if (!rising && (progress === undefined || progress >= 1)) {
      this.rest()
      return
    }
    const clocked = progress ?? 1
    const current = this.options.between(this.from, field, {
      axes: clocked,
      floor: (key) => this.rising.has(key),
      share: (key) => {
        const one = this.rising.get(key)
        if (one) {
          return grownAt(one.step, one.steps, now - one.since)
        }
        return this.standing.has(key) ? 1 : clocked
      },
    })
    /* Readings `between` cannot move, such as a grid whose places changed,
       are drawn as they are, with no clock left running on nothing. */
    if (current === field) {
      this.rest()
      return
    }
    this.current = current
    this.host.requestUpdate()
    if (!this.pending) {
      this.pending = true
      requestAnimationFrame(() => {
        this.pending = false
        if (this.current !== undefined && !this.waiting) {
          this.frame(performance.now())
        }
      })
    }
  }

  /**
   * Ends any move and draws the readings as they are, asking for an update
   * unless `update` is false, as within `follow`, which runs before one.
   */
  private rest(update = true): void {
    const was = this.current !== undefined
    const entered = this.entering
    this.clock?.cancel()
    this.clock = undefined
    this.rising.clear()
    this.standing.clear()
    this.from = undefined
    this.current = undefined
    this.entering = false
    if (this.waiting) {
      this.waiting = false
      this.seen?.disconnect()
      this.seen = undefined
    }
    if (entered) {
      this.watchExit()
    }
    if (was && update) {
      this.host.requestUpdate()
    }
  }
}
