import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { endInSight } from '../../utils/load-more/load-more.js'
import { reportRuntime } from '../../utils/report-runtime/report-runtime.js'
import { Heights } from './heights.js'
import type { Waterfall } from './waterfall.js'

/** What the controller needs of a set and the box it is shown in. */
export interface VirtualizeOptions {
  /** The scrolling box, or null before it renders. */
  container: () => HTMLElement | null | undefined
  /** How many items there are in total, shown or not. */
  count: () => number
  /** How tall one item is along the scroll axis, in pixels. */
  estimate: () => number
  /**
   * The space between two items along the scroll axis, in pixels, which the
   * host draws, such as a flex or grid `gap`. Each item counts it as part of
   * its own size. Zero by default.
   */
  gap?: () => number
  /**
   * Whether the set runs across the box, scrolled sideways. The scroll axis is
   * then the inline one: offsets are `scrollLeft` from the start of the line,
   * which runs right to left on a right-to-left page, and items are measured
   * by their width. Down the box by default.
   */
  horizontal?: () => boolean
  /**
   * Rows kept either side of what fits, so a scroll reveals something drawn
   * rather than something blank. Four by default.
   *
   * While the box scrolls, one more screen of rows is drawn on the side it is
   * scrolling toward. On iOS the scroll runs in another process, and the page
   * hears where it is a frame or more later. Four rows of 32 pixels cover
   * about 18 milliseconds of a fling at 7,000 pixels a second, so without
   * that screen the leading edge showed the empty spacer.
   */
  overscan?: number
  /**
   * The rendered rows, in window order, for a set whose items differ in height.
   *
   * **Supplying this is what turns measurement on**, and leaving it off keeps
   * the straight line the note below defends. A host that returns its row
   * elements gets each one measured after it renders and placed by what it
   * came to; a host that returns nothing gets every item at `estimate`, which
   * is right whenever the rows really are uniform and is cheaper. A host that
   * returns its rows and turns `measured` off keeps the straight line, with its
   * slope read once from the rows it drew.
   *
   * **Each row carries its own index rather than being counted off from
   * `window.first`.** A host is free to place its rows whenever it likes, and
   * `hostUpdated` runs *before* `updated`, so a host that appends there has the
   * previous window's rows in the tree when this is asked. Counting positionally
   * would then record the heights of the right elements against the wrong
   * items, and be silently wrong exactly when the window moved.
   */
  rows?: () => Iterable<Rendered>
  /**
   * Whether to place by measurement on this pass, for a host that can be told.
   *
   * **Separate from `rows` because the two answer different questions**: `rows`
   * says a host is able to report what it drew, and this says it wants the
   * measured placement today. A host with a `measured` attribute needs to
   * change its mind at runtime, and a controller is constructed once.
   *
   * True by default, so a host that supplies `rows` and nothing else measures.
   * The uniform path is kept for the case it is better at: it converts offset
   * to index by division, where the measured one builds prefix sums across the
   * whole set the first time it is asked.
   */
  measured?: () => boolean
  /**
   * Whether the controller holds the reader still on this pass when rows
   * above them turn out a different height than estimated. True by default.
   *
   * A host that keeps its own reader in place answers false while it does,
   * because two holds on one box each undo part of the other. `Chat` holds the
   * turn being read while the log is still, and answers true while the reader
   * scrolls, so the controller's spacer takes the move and nothing writes the
   * scroll offset during a fling.
   */
  anchor?: () => boolean
  /**
   * Lays the items out down several columns, each item under the column that
   * ends highest, as a wall of photos is: a `Waterfall`, whose `lanes` says how
   * many columns. The window is then every item that reaches into the box, in
   * the order of the set, and a host draws each item at its column,
   * `waterfall.lane(index)`, and at `offsetOf(index)` down the set, which
   * `offsetOf(count)` is the length of. Items are placed by measurement, so a
   * host supplies `rows`. None by default.
   */
  waterfall?: () => Waterfall | undefined
}

/** A row that has been drawn, and which item of the set it drew. */
export interface Rendered {
  /** The element, measured along the scroll axis. */
  element: HTMLElement
  /** Which item it is, in the whole set rather than in the window. */
  index: number
}

/** Which slice is rendered, and how much empty space stands in for the rest. */
export interface Window {
  /** How much room the items before `first` would have taken, in pixels. */
  before: number
  /** How much room the items after `last` would take, in pixels. */
  after: number
  /** Index of the first item rendered. */
  first: number
  /** Index one past the last item rendered. */
  last: number
}

/** Where `reveal` puts an item, and how it gets there. */
export interface RevealOptions {
  /**
   * Where the item lands: the least distance that shows it whole (`nearest`,
   * the default), or at the box's `start`, `center` or `end`.
   */
  align?: 'center' | 'end' | 'nearest' | 'start'
  /** The platform's scroll behavior. Instant when left out. */
  behavior?: ScrollBehavior
}

/**
 * How many times an update this asked for may change the answer again.
 *
 * **A measurement that its own render moves has no fixed point, so something
 * has to stop looking for one.** `clientHeight` is meant to be a fact about the
 * box, true of any real scroller, and false of a box with no height: there it
 * is a function of the rows just drawn, so `measure` renders, the render
 * changes the height, and the next measurement disagrees.
 *
 * It does not even diverge, which is what made it hard to see. Measured on the
 * headless tier with 500 rows and no height on the viewport, it converged
 * toward a non-integer and then oscillated between 378 and 379 rows forever,
 * 2505 passes in eight seconds. The loop runs on microtasks, so timers never
 * fire, and every deadline written to catch this, the harness's 2000ms race and
 * the spec's own bounded `settle`, is a `setTimeout` that cannot run. The page
 * simply stops.
 *
 * Ten, because a legitimate settling is two or three: nothing, then the real
 * height, then agreement.
 */
const UNSTABLE = 10

/**
 * How long the box has to be still, in milliseconds, before a correction
 * held in the spacer is written to the scroll offset. A fling moves the box
 * every frame, so a gap this long means it has ended.
 */
const REST = 150

/**
 * How many boxes the window draws past each edge of the box on a screen that
 * is touched, so that a finger or a fling stays inside rows already drawn.
 *
 * **A row drawn or taken out while the box is moving ends the touch on iOS.**
 * Safari reads a change to what a slot holds, which is what a row coming or
 * going in the host's light DOM is, as a change to the box itself, and the
 * scroll that was under the finger stops. Measured on the iOS Simulator: with a
 * row added on the first scroll event, the box moved 10 points under a drag of
 * 130 and the rest of the drag did nothing, and the same rows added to a
 * wrapper inside the slot, or to the page with no slot, left the box tracking
 * the finger. So a touched list draws this much beyond the box, holds the rows
 * it has while the box moves, and draws the next window once it is still.
 */
const BUFFER = 2

/**
 * Works out which slice of a long set is worth rendering.
 *
 * **A controller and not an element, which is the whole reason it is here.**
 * Table, Listbox, Combobox and Tree each need windowing *inside* themselves,
 * and an element would make each of them nest one in its own shadow root: a
 * listbox whose options are inside a `<helix-virtual-list>` is a listbox whose
 * options are no longer its children, so its own keyboard, its own selection
 * and its own ARIA all have a stranger in the middle of them.
 *
 * **A windowed set still reports its true length, and each row its true
 * position.** This is the part virtualization usually gets wrong and the reason
 * the arithmetic lives somewhere shared. A reader on row 4,000 of 10,000 must
 * hear "4,000 of 10,000", so `aria-setsize` is the count and `aria-posinset` is
 * the real index, never the position within the rendered slice. The window is a
 * rendering decision and the set is a fact, and a component that lets the first
 * overwrite the second has told a screen reader the list is twelve long.
 *
 * **The spacers are what make the scrollbar honest.** Rendering twelve rows in
 * a box that should scroll for ten thousand gives a thumb the size of the
 * track, so the room the absent rows would have taken is left as padding before
 * and after. A reader dragging that thumb is dragging against the real length.
 *
 * **The set arrives as data**, which is what lets a host create only the rows
 * in the window. A host takes it through a property (an `items` array, which
 * `applyReactProperties` carries across React hydration with every other object
 * property) or as text in the markup (a `<script type="application/json">`
 * named by `for`, which a server emits and which is one node whatever the
 * row count). A host that is handed its rows as light-DOM children still gets
 * the expensive half from this: the rows outside the window are not laid out
 * and not painted, and the node count stays.
 *
 * **One estimate, not per-row measurement.** Measuring every row to place it is
 * how a virtual list ends up reading the layout it is trying to avoid, and it
 * is what makes them jump: a row taller than its estimate shifts everything
 * after it at the moment it renders. A fixed estimate is a straight line
 * between scroll offset and index, which never disagrees with itself. Rows of
 * genuinely different heights are a different component and a harder one.
 */
export class VirtualizeController implements ReactiveController {
  private readonly host: ReactiveControllerHost
  private readonly options: VirtualizeOptions
  private observer: ResizeObserver | undefined
  private watching = false

  /** Consecutive measurements that moved the window with nothing outside asking. */
  private settling = 0

  /** Whether the consumer has been told their box cannot be measured. */
  private warned = false

  /** The host's own inputs, so a change in them is not read as a runaway. */
  private last: { count: number; estimate: number } | undefined

  /** The slice to render, recomputed on scroll and on resize. */
  window: Window = { after: 0, before: 0, first: 0, last: 0 }

  /** Where each item starts, once any of them has been seen. */
  private readonly heights: Heights

  /** Room `shift` added above the window, owed to the scroll offset once drawn. */
  private owed = 0

  /**
   * The drawn rows' own height on the straight line, read once per estimate,
   * and without the gap, which `line` adds as it is now.
   *
   * Undefined until a host that offers `rows` has drawn some on the uniform
   * path, and again after `forget`.
   */
  private sample: { estimate: number; size: number } | undefined

  /**
   * The gap the heights and the line were last squared with, which `line`
   * reads, so the gap the host has now is taken up in `respace` alone.
   */
  private spaced: number | undefined

  /** The length of the set when `endInSight` last answered true. */
  private askedAt = -1

  /**
   * How far the drawn rows sit from where the measured heights place them, in
   * pixels, while the reader is scrolling.
   *
   * **A correction written to `scrollTop` during a fling ends the fling on
   * iOS.** A row above the reader that turns out shorter than its estimate
   * moves everything below it, and the controller has to put the reader back.
   * While the box scrolls, the before spacer takes the difference and
   * `scrollTop` is left alone. The spacer and the scroll offset are squared
   * once the box has been still for `REST` milliseconds with no finger on it,
   * or straight away when the spacer would have to be negative or the first
   * row would sit below the top of the set.
   */
  private drift = 0

  /**
   * The scroll offset at the last scroll event or the last write of this
   * controller's own, which gives the direction, and a move still to be heard.
   */
  private lastTop = 0

  /**
   * The item `reveal` scrolled to, which corrections hold still until the
   * reader scrolls. Rows measured between the top of the box and that item
   * would otherwise move it back out of view.
   */
  private target: number | undefined

  /** The way the box last scrolled: 1 down, -1 up, 0 before any scroll. */
  private heading: -1 | 0 | 1 = 0

  /** Whether a finger is on the box. iOS keeps scrolling after it lifts. */
  private touching = false

  /**
   * Whether the reader uses a touch screen: the device says its pointer is
   * coarse, or a finger has been on the box. Rows are held while the box moves
   * on such a screen only, since a mouse wheel does not end on a row change.
   */
  private touched = typeof matchMedia === 'function' && matchMedia('(any-pointer: coarse)').matches

  /** The timer that ends a scroll, set again on every scroll event. */
  private resting: ReturnType<typeof setTimeout> | undefined

  /**
   * Whether the rows drawn on the straight line have come out different
   * heights. From then on the list is placed by measurement, whatever
   * `measured` says. A list whose rows are one height on a wide screen can
   * wrap on a phone, and a straight line through rows of different heights
   * moves the content by the difference each time a row enters or leaves.
   */
  private uneven = false

  constructor(host: ReactiveControllerHost, options: VirtualizeOptions) {
    this.host = host
    this.options = options
    /* Unmeasured items stand at the straight line's height, which is the
       estimate until drawn rows have been read. */
    this.heights = new Heights(() => this.line())
    host.addController(this)
    /* **The render after a render is this controller's design**: rows are
       measured once they are drawn, and a window that moves draws again.
       Lit's development build warns of an update asked for after one
       completed, on every list that moves its window, so the warning is
       turned off for the class this serves. Lit's production build has no
       warnings, and no `disableWarning`. */
    ;(host.constructor as { disableWarning?: (kind: string) => void }).disableWarning?.(
      'change-in-update',
    )
  }

  hostConnected(): void {
    /* Nothing is observed here, and that is deliberate. `hostConnected` runs
       before the first render, so the container query returns null and an
       observer attached to nothing observes nothing for the life of the
       element. It is an invisible failure: the first measurement is right, so
       the only symptom is a window that never moves again. */
    /* **The count is deliberately not cleared here**, which is the obvious
       thing to do and does not work. A resize looks like an outside cause and
       is not one when the box has no height of its own: the render this
       controller asked for is what changed the size, so the observer fires on
       every pass and resets the very counter meant to notice that. Measured:
       the guard made no difference at all, 7776 passes in twenty-five seconds,
       identical to having none.

       Nothing is lost by leaving it. A genuine resize changes the window once
       and the next measurement agrees, which clears the count through `same`. A
       runaway never agrees, which is the whole distinction. */
    this.observer = new ResizeObserver(() => {
      this.measure()
    })
  }

  hostDisconnected(): void {
    this.observer?.disconnect()
    this.observer = undefined
    this.watching = false
    const box = this.options.container()
    box?.removeEventListener('scroll', this.handleScroll, { capture: true })
    box?.removeEventListener('touchstart', this.handleTouchStart)
    box?.removeEventListener('touchend', this.handleTouchEnd)
    box?.removeEventListener('touchcancel', this.handleTouchEnd)
    box?.removeEventListener('scrollend', this.handleTouchEnd)
    clearTimeout(this.resting)
    this.resting = undefined
    this.touching = false
  }

  /** Attaches to the box the first time there is one to attach to. */
  private watch(): void {
    if (this.watching) {
      return
    }
    const box = this.options.container()
    if (!box || !this.observer) {
      return
    }
    this.observer.observe(box)
    /* **In the capture phase, so it runs before a host's own `scroll`
       listener on the same box.** A host that measures from its listener gets
       an update, and the update runs between the two listeners. Run second,
       this one had not yet marked the box as scrolling, so that update wrote
       its correction to the scroll offset in the middle of the fling. */
    box.addEventListener('scroll', this.handleScroll, { capture: true, passive: true })
    box.addEventListener('touchstart', this.handleTouchStart, { passive: true })
    box.addEventListener('touchend', this.handleTouchEnd, { passive: true })
    box.addEventListener('touchcancel', this.handleTouchEnd, { passive: true })
    /* A scroll that has ended has no finger on it, which covers a touch whose
       end never arrived. Chromium's synthesized flings send none. */
    box.addEventListener('scrollend', this.handleTouchEnd, { passive: true })
    /* Where the box is now, so an offset set before this attached is not
       read as a move whose event is still to come. */
    this.lastTop = this.scrolled(box)
    /* Takes the box out of the browser's scroll anchoring, through a rule
       `HelixElement` ships into the shadow root of a host that names
       `VIRTUAL_RULE` in its `markRules`. See `VIRTUAL_RULE` in
       `mark-rules.ts`. */
    box.setAttribute('data-virtual', '')
    this.watching = true
  }

  /** Whether the scroll axis is the inline one. */
  private across(): boolean {
    return this.options.horizontal?.() ?? false
  }

  /** The box's scroll offset from the start of the set. */
  private scrolled(box: HTMLElement): number {
    return this.across() ? Math.abs(box.scrollLeft) : box.scrollTop
  }

  /**
   * Scrolls the box to `to` from the start of the set, and notes it. Sideways
   * on a right-to-left page the offset counts down from zero.
   */
  private scrollBox(box: HTMLElement, to: number): void {
    if (this.across()) {
      box.scrollLeft = getComputedStyle(box).direction === 'rtl' ? -to : to
    } else {
      box.scrollTop = to
    }
    this.lastTop = this.scrolled(box)
  }

  /** How long the box is along the scroll axis. */
  private span(box: HTMLElement): number {
    return this.across() ? box.clientWidth : box.clientHeight
  }

  /** How long an element is along the scroll axis. */
  private length(element: Element): number {
    const box = element.getBoundingClientRect()
    return this.across() ? box.width : box.height
  }

  /* `passive`, because this never calls `preventDefault` and saying so lets the
     browser scroll without waiting to find out. */
  private readonly handleScroll = (): void => {
    // A reader moved, which is the one input this exists to answer.
    const box = this.options.container()
    if (box) {
      this.noteClamp(box)
    }
    const top = box ? this.scrolled(box) : 0
    if (top !== this.lastTop) {
      this.heading = top > this.lastTop ? 1 : -1
      this.lastTop = top
      this.target = undefined
      clearTimeout(this.resting)
      this.resting = setTimeout(this.rest, REST)
    }
    this.settling = 0
    this.measure()
  }

  private readonly handleTouchStart = (): void => {
    this.touching = true
    this.touched = true
  }

  private readonly handleTouchEnd = (): void => {
    this.touching = false
    if (this.resting === undefined) {
      this.rest()
    }
  }

  /** The box's scroll offset now, or the last one noted where there is no box. */
  private scrolledNow(): number {
    const box = this.options.container()
    return box ? this.scrolled(box) : this.lastTop
  }

  /**
   * Whether the reader is scrolling: a finger is on the box, the box moved
   * within the last 150 milliseconds, or it has moved and its `scroll` event
   * has not arrived yet.
   *
   * For a host that holds its own reader: a write to the scroll offset while
   * this is true ends a fling on iOS, and a reader position noted before the
   * last move is out of date.
   */
  scrolling(): boolean {
    return this.touching || this.resting !== undefined || this.scrolledNow() !== this.lastTop
  }

  /**
   * Takes the offset as the box's own where the box moved it up only because
   * the set below it got shorter, which the browser does to keep the offset
   * inside the content, and answers where it was before.
   *
   * **Not a reader scrolling.** Rows at the end of the set measured shorter
   * than their estimates shrink the content, and the box pulls its offset back
   * to the new bottom before any `scroll` event arrives. Read as a scroll, the
   * difference went into the spacer as drift and was then paid a second time:
   * in Chromium, End on 2,000 rows of one to five lines left the window 292
   * pixels above the last item, which stayed drawn below the box as the row
   * holding focus.
   */
  private noteClamp(box: HTMLElement): number {
    const was = this.lastTop
    if (
      !this.touching &&
      this.scrolled(box) < was &&
      this.scrolled(box) >=
        (this.across() ? box.scrollWidth : box.scrollHeight) - this.span(box) - 1
    ) {
      this.lastTop = this.scrolled(box)
    }
    return was
  }

  /** Squares the spacer and the scroll offset once the box is still. */
  private readonly rest = (): void => {
    this.resting = undefined
    if (this.touching) {
      return
    }
    if (this.drift === 0) {
      /* The window held while the box moved is drawn now it is still. */
      if (this.touched) {
        this.measure()
      }
      return
    }
    this.square()
    this.settling = 0
    this.measure()
    this.host.requestUpdate()
  }

  /**
   * Moves the drift into the scroll offset, so the rows do not move on screen
   * when the render takes it out of the spacer.
   *
   * **The write goes on whichever side of the render keeps the room it
   * needs.** A spacer that shrinks takes the room with it, and at the end of
   * the set the box clamps the offset to the new height before `hostUpdated`
   * runs. Written there as well, the move was made twice: in Chromium, End in
   * a windowed Object Inspector left the focused row 61 pixels below the box.
   * So a shrinking spacer is paid for now, and a growing one after the render.
   *
   * **A move owed to the render asks for that render.** At the start of the
   * set the spacer is already zero, so squaring leaves the window the same and
   * `measure` asks for no update. The owed move then waited for whatever
   * rendered next. In Chromium, a chat scrolled to its top measured the turns
   * above the reader 62 pixels taller than their estimates, and the history
   * prepended after that paid the 62 pixels along with its own room, so the
   * turn being read moved 62 pixels.
   */
  private square(): void {
    const box = this.options.container()
    if (this.drift > 0 && box) {
      this.scrollBox(box, this.scrolled(box) - this.drift)
    } else if (this.drift !== 0) {
      this.owed -= this.drift
      this.host.requestUpdate()
    }
    this.drift = 0
  }

  /**
   * Where the top of the box is in the measured heights, in pixels: the
   * scroll offset, with what is owed to it and less the drift.
   */
  private offset(box: HTMLElement): number {
    return this.scrolled(box) + this.owed - this.drift
  }

  /**
   * How far past the screen to draw toward the side the box is scrolling to,
   * and on a touched screen on both sides, `BUFFER` boxes of it.
   */
  private lead(box: HTMLElement): number {
    if (this.touched) {
      return this.span(box) * BUFFER
    }
    return this.heading === 0 ? 0 : this.span(box)
  }

  /** Whether the rows beyond the box are drawn on the side the box is not scrolling to. */
  private both(): boolean {
    return this.touched
  }

  /**
   * Reads the scroll offset and settles the window.
   *
   * Asks for an update only when the slice actually moved. A scroll fires many
   * events per frame and most of them land inside the row already at the top,
   * so requesting one per event would re-render the list for every pixel.
   */
  measure(): void {
    this.watch()
    const box = this.options.container()
    const total = Math.max(0, this.options.count())
    this.respace(box, total)
    const size = this.line()
    if (!box) {
      return
    }
    const overscan = this.options.overscan ?? 4
    const choose = (): Window =>
      this.measuring()
        ? this.placed(box, total, overscan)
        : this.uniform(box, total, size, overscan)
    let next = choose()
    /* The spacer cannot carry a negative drift past zero, and a positive one
       at the start of the set would leave room above the first row. Squared
       now, during the scroll, which is the one write this cannot put off. */
    if (this.drift !== 0 && (next.before < 0 || next.first === 0)) {
      this.square()
      next = choose()
    }
    /* The host's own numbers changing is an outside cause, the same as a scroll
       or a resize: a set that grew is not this controller chasing itself. */
    const moved = this.last?.count !== total || this.last.estimate !== size
    if (moved) {
      this.last = { count: total, estimate: size }
      this.settling = 0
    }
    /* **Rows are not drawn or taken out while the box moves under a touch, so
       long as the rows drawn cover it.** See `BUFFER`. Only the spacers follow. */
    if (!moved && this.holds(box, total)) {
      next = this.frame(this.window.first, this.window.last, total, size)
    }

    const same =
      next.first === this.window.first &&
      next.last === this.window.last &&
      next.before === this.window.before &&
      next.after === this.window.after
    if (same) {
      // It settled, so nothing that came before it was a runaway either.
      this.settling = 0
      return
    }

    if (this.settling >= UNSTABLE) {
      /* Hold what is *rendered*, which is `this.window`, rather than adopting a
         reading nothing will draw. Refusing the update and keeping `next` would
         leave the two disagreeing with no way back: the next measurement would
         find them the same and do nothing. */
      this.report()
      return
    }

    this.settling += 1
    this.window = next
    this.host.requestUpdate()
  }

  /**
   * Whether the rows already drawn are kept for now: the screen is touched, the
   * box is moving, and the rows drawn cover all of it.
   *
   * A waterfall uses the same hold. Coverage is how far the drawn items reach
   * down the set, the furthest of their ends, because an item yet to be drawn
   * can start in a short column above the bottom of a tall one. Adding or
   * taking a slotted row is what ends the touch.
   */
  private holds(box: HTMLElement, total: number): boolean {
    if (!this.touched || !this.scrolling()) {
      return false
    }
    const { first, last, before } = this.window
    if (last <= first || last > total) {
      return false
    }
    const top = this.scrolled(box)
    const bottom = top + this.span(box)
    const lanes = this.laned(total)
    if (lanes) {
      return top >= this.startOf(first, total) && bottom <= lanes.reachThrough(last - 1)
    }
    const size = this.line()
    const drawn = this.measuring()
      ? this.startOf(last, total) - this.startOf(first, total)
      : (last - first) * size
    return top >= before && bottom <= before + drawn
  }

  /** The window with the rows `first` to `last`, and the spacers that stand in for the rest. */
  private frame(first: number, last: number, total: number, size: number): Window {
    return this.measuring()
      ? {
          after: Math.max(0, this.startOf(total, total) - this.startOf(last, total)),
          before: this.startOf(first, total) + this.drift,
          first,
          last,
        }
      : { after: Math.max(0, (total - last) * size), before: first * size, first, last }
  }

  /** The straight line: one estimate, so offset and index convert by division. */
  private uniform(box: HTMLElement, total: number, size: number, overscan: number): Window {
    /* Held to the set, for an offset left past the end of a set that shrank:
       the box clamps its offset a frame later, and a window starting past the
       last item until then moved on every pass. */
    const extra = Math.ceil(this.lead(box) / size)
    const at = Math.min(Math.floor(this.offset(box) / size), total)
    const first = Math.max(0, at - overscan - (this.heading < 0 || this.both() ? extra : 0))
    const fits =
      Math.ceil(this.span(box) / size) +
      overscan * 2 +
      (this.both() ? extra * 2 : this.heading === 0 ? 0 : extra)
    const last = Math.min(total, first + fits)
    return { after: Math.max(0, (total - last) * size), before: first * size, first, last }
  }

  /**
   * How tall one item is on the straight line: the drawn rows' height once
   * read, and `estimate` until then.
   *
   * **An estimate that is wrong on the straight line leaves the end of the
   * set out of reach.** Rows of 21 pixels placed at 32 fill two thirds of the
   * room they are counted for, so the window stops short of the bottom of the
   * box and the spacer after it holds the rest: in Chromium, `scrollToIndex`
   * on the last of 5,000 such rows scrolled to the end and drew nothing there.
   * Reading the drawn rows once corrects the slope, and it is still a line.
   */
  private line(): number {
    return this.row() + (this.spaced ?? this.gap())
  }

  /** How tall one item's own row is on the straight line, without the gap. */
  private row(): number {
    const estimate = Math.max(1, this.options.estimate())
    return this.sample?.estimate === estimate ? this.sample.size : estimate
  }

  /**
   * Moves everything to a gap that changed, and keeps the reader on the item
   * they were on.
   *
   * **Each item counts the gap after it as part of its own height**, so a gap
   * that changes changes every item. The straight line reads the gap as it is
   * now, and every height measured with the old one moves by the difference,
   * drawn or not. Left alone, both kept the old gap while the rows drawn
   * between the spacers took the new one, so the set grew or shrank as the
   * window did: in WebKit, End on 1,000 rows whose gap went from 0 to 12 left
   * the last row 72 pixels below the box once the window lost six rows.
   *
   * The reader's place is owed to the scroll offset and written after the
   * render, as `shift` does, because a gap that grows has no room for it yet.
   */
  private respace(box: HTMLElement | null | undefined, total: number): void {
    const gap = this.gap()
    const was = this.spaced
    if (was === undefined) {
      this.spaced = gap
      return
    }
    if (was === gap) {
      return
    }
    /* Where the reader's item stood is read before `spaced` moves, with every
       item at the old gap, the unmeasured ones included, and where it stands
       now after. */
    const top = box ? this.offset(box) : 0
    const anchor = this.measuring() ? (this.target ?? this.indexAt(top, total)) : 0
    const from = this.measuring() ? this.startOf(anchor, total) : this.line()
    this.heights.pad(gap - was)
    this.spaced = gap
    const moved = this.measuring()
      ? this.startOf(anchor, total) - from
      : (top / from) * this.line() - top
    this.settling = 0
    if (box && top > 0 && moved !== 0 && (this.options.anchor?.() ?? true)) {
      this.owed += moved
      this.host.requestUpdate()
    }
  }

  /** The space the host draws between two items, which each item counts. */
  private gap(): number {
    return Math.max(0, this.options.gap?.() ?? 0)
  }

  /**
   * Reads the drawn rows' height once for the straight line, for a host that
   * offers `rows` and does not measure.
   *
   * The mean of the rows drawn, each item's elements counted together. A row
   * with no height, such as one that is not laid out, says nothing. When the
   * line moves, the scroll offset moves with it, so the item at the top of the
   * box stays there.
   */
  private sampleRows(): void {
    const estimate = Math.max(1, this.options.estimate())
    const heights = new Map<number, number>()
    for (const { element, index } of this.options.rows?.() ?? []) {
      heights.set(index, (heights.get(index) ?? 0) + this.length(element))
    }
    const seen = [...heights.values()].filter((height) => height > 0)
    if (seen.length === 0) {
      return
    }
    /* Read on every pass, because rows that wrap can arrive at any point in
       the set. The slope is still read once per estimate. */
    const uneven = Math.max(...seen) - Math.min(...seen) > 1
    if (this.sample?.estimate !== estimate) {
      const was = this.line()
      this.sample = {
        estimate,
        size: Math.max(1, seen.reduce((sum, height) => sum + height, 0) / seen.length),
      }
      const size = this.line()
      if (Math.abs(size - was) >= 0.5) {
        const box = this.options.container()
        if (box && this.scrolled(box) > 0) {
          this.scrollBox(box, (this.scrolled(box) / was) * size)
        }
        this.settling = 0
        if (!uneven) {
          this.measure()
        }
      }
    }
    if (uneven) {
      /* Rows of different heights are placed by measurement from here on, and
         the rows not yet drawn stand at the line's height. */
      this.uneven = true
      this.settle()
    }
  }

  /** Whether this pass places by measurement: offered, and wanted or needed. */
  private measuring(): boolean {
    return (
      this.options.rows !== undefined &&
      (this.uneven ||
        this.options.waterfall?.() !== undefined ||
        (this.options.measured?.() ?? true))
    )
  }

  /** The waterfall the host lays its items out in, placed by the heights known now. */
  private laned(total: number): Waterfall | undefined {
    const lanes = this.options.rows ? this.options.waterfall?.() : undefined
    lanes?.place(total, (index) => this.heights.at(index), this.heights.stamp())
    return lanes
  }

  /**
   * Where item `index` starts down the set, before any drift: after the items
   * before it, or in its column of a waterfall, where the starts never go back
   * up either.
   */
  private startOf(index: number, total: number): number {
    return this.laned(total)?.start(index) ?? this.heights.before(index, total)
  }

  /**
   * The item at `offset`: the last to start at or before it, or in a
   * waterfall the first to reach past it.
   */
  private indexAt(offset: number, total: number): number {
    const lanes = this.laned(total)
    return lanes
      ? Math.min(lanes.from(offset), Math.max(0, total - 1))
      : this.heights.indexAt(offset, total)
  }

  /**
   * The measured version, which asks where each item starts rather than dividing.
   *
   * The scan for `last` walks forward from `first` rather than searching,
   * because it stops at the bottom of the viewport: it is bounded by what fits
   * on screen plus the overscan, whatever the set's length.
   */
  private placed(box: HTMLElement, total: number, overscan: number): Window {
    const top = this.offset(box)
    const lead = this.lead(box)
    const from = this.heading < 0 || this.both() ? top - lead : top
    /* A line of a waterfall's columns at a time. */
    const more = overscan * (this.laned(total)?.lanes ?? 1)
    const first = Math.max(0, this.indexAt(from, total) - more)
    const bottom = top + this.span(box) + (this.heading > 0 || this.both() ? lead : 0)
    let last = this.indexAt(top, total)
    while (last < total && this.startOf(last, total) < bottom) {
      last += 1
    }
    last = Math.min(total, last + more)
    return {
      after: Math.max(0, this.startOf(total, total) - this.startOf(last, total)),
      before: this.startOf(first, total) + this.drift,
      first,
      last,
    }
  }

  /**
   * The items on screen, with no overscan: `first` is the item at the top of
   * the box and `last` is one past the item at its bottom, so
   * `items.slice(first, last)` is what a reader sees.
   *
   * For a host that reports what is visible, where `window` is what is drawn.
   * An empty span (`first === last`) while the box has no height or the set
   * no items.
   */
  visible(): { first: number; last: number } {
    const box = this.options.container()
    const total = Math.max(0, this.options.count())
    if (!box || total === 0) {
      return { first: 0, last: 0 }
    }
    const top = Math.max(0, this.offset(box))
    const bottom = top + this.span(box)
    if (!this.measuring()) {
      const size = this.line()
      const first = Math.min(Math.floor(top / size), total)
      return { first, last: Math.max(first, Math.min(total, Math.ceil(bottom / size))) }
    }
    const first = this.indexAt(top, total)
    let last = first
    while (last < total && this.startOf(last, total) < bottom) {
      last += 1
    }
    return { first, last }
  }

  /**
   * How much of the set lies below the bottom of the box, in pixels.
   *
   * For a host that asks for more items as a reader nears the end. Read from
   * the arithmetic and not from `scrollHeight`, which also counts whatever the
   * host draws around the rows.
   */
  remaining(): number {
    const box = this.options.container()
    if (!box) {
      return 0
    }
    const total = Math.max(0, this.options.count())
    const length = this.measuring() ? this.startOf(total, total) : total * this.line()
    return Math.max(0, length - Math.max(0, this.offset(box)) - this.span(box))
  }

  /**
   * Whether a reader has come within one screen of the end of the set, true
   * once for each length of it.
   *
   * For a host that asks for more items as a reader nears the end: it sends
   * its request when this answers true, and the set growing lets it answer
   * true again. False while the box has no height or the set no items, so a
   * list that has not been laid out asks for nothing.
   *
   * `length` is what the answer is kept for, the count by default. A host
   * whose count is a filtered view of what it holds passes what it holds, so
   * new items that the filter hides still let it ask again.
   */
  endInSight(length = Math.max(0, this.options.count())): boolean {
    /* The rule is core's `endInSight`, which Listbox asks of its own scroll,
       so the two lists ask on the same terms. */
    const box = this.options.container()
    if (
      this.options.count() <= 0 ||
      !endInSight({
        askedAt: this.askedAt,
        count: length,
        remaining: this.remaining(),
        screen: box ? this.span(box) : 0,
      })
    ) {
      return false
    }
    this.askedAt = length
    return true
  }

  /**
   * The two spacers' heights for the window, with item `kept` drawn too.
   *
   * For a host that keeps an item outside the window drawn, the row holding
   * focus say. The item takes its own room out of the spacer on its side, so
   * the scrollbar still measures the set. Every host that keeps a focused row
   * asks this, so the arithmetic is written once.
   */
  spacers(kept?: number): { after: number; before: number } {
    const { after, before, first, last } = this.window
    if (kept === undefined || (kept >= first && kept < last)) {
      return { after, before }
    }
    const room = this.sizeOf(kept)
    return {
      after: kept >= last ? Math.max(0, after - room) : after,
      before: kept < first ? Math.max(0, before - room) : before,
    }
  }

  /**
   * Measures what was just drawn, and holds the reader still if it moved.
   *
   * **This is the pass the fixed-estimate note warns about, made to terminate.**
   * Measuring after a render, and re-windowing on what was measured, is a loop
   * that feeds itself. What bounds it is that a height is news exactly once:
   * `record` answers false for a size it already holds, so an item can move the
   * window on the render that first shows it and never again. A set of ten
   * thousand can therefore surprise this ten thousand times over its life and
   * not twice for the same row.
   *
   * **The scroll offset is corrected before anything is drawn again.** An item
   * above the window turning out taller than its estimate moves everything
   * below it, including what the reader is looking at. Adding the same
   * difference to `scrollTop` puts the content back under them, which is why a
   * list of variable rows can be scrolled through without it walking away.
   * Skipped at the very top, where there is nothing above to have moved.
   */
  hostUpdated(): void {
    /* After the render rather than when `shift` is called, because the room is
       not there yet: a scroll offset past the old height is clamped to it. */
    if (this.owed !== 0) {
      const box = this.options.container()
      if (box) {
        this.scrollBox(box, this.scrolled(box) + this.owed)
      }
      this.owed = 0
    }
    this.settle()
  }

  /**
   * Measures the rows in the tree now, and holds the reader still if they moved.
   *
   * `hostUpdated` calls this. A host that draws its rows after `hostUpdated`,
   * in `updated`, calls it again once they are drawn, so the rows of this
   * window are measured in the pass that draws them. Measured a pass later, a
   * window chosen by the estimate stopped short of the bottom of the box and
   * stayed there until the next scroll: in Chromium, 5,000 rows of 21 pixels
   * against an estimate of 32 left 142 to 157 pixels of the box empty after
   * each jump of 1,500 pixels, and the next scroll moved the reader back 297.
   *
   * **The reader is held by the row at the top of the box.** Rows drawn above
   * it for the first time move it by what they came to, less what they were
   * estimated at. The window's first row is the wrong anchor: no row before
   * it is drawn, so nothing before it is measured, and the rows that do move
   * the reader were never counted.
   */
  settle(): void {
    /* Before a row is recorded, so a row drawn with the new gap is not then
       moved by it a second time. */
    this.respace(this.options.container(), Math.max(0, this.options.count()))
    if (!this.measuring()) {
      this.sampleRows()
      return
    }
    const rows = this.options.rows?.()
    if (!rows) {
      return
    }
    const total = Math.max(0, this.options.count())
    const box = this.options.container()
    const from = box ? this.noteClamp(box) : this.lastTop
    const top = box ? this.offset(box) : 0
    const anchor = this.target ?? this.indexAt(top, total)
    const was = this.startOf(anchor, total)
    let news = false
    for (const { element, index } of rows) {
      if (this.heights.record(index, this.length(element) + this.gap())) {
        news = true
      }
    }
    if (!news) {
      return
    }
    /* An outside cause, on the same terms as a resize: the set told this
       something it did not know. Bounded, per the note above. */
    this.settling = 0
    const moved = this.startOf(anchor, total) - was
    if (box && top > 0 && moved !== 0 && (this.options.anchor?.() ?? true)) {
      if (this.scrolling()) {
        this.drift -= moved
      } else {
        /* From where the box was, which a clamp to a shorter set has already
           moved by part of the same difference. */
        this.scrollBox(box, from + moved)
      }
    }
    /* In a waterfall an item measured anywhere can move the items under it
       without moving the window, so the host draws them where they are now. */
    if (this.laned(total)) {
      this.host.requestUpdate()
    }
    this.measure()
  }

  /**
   * Tells the controller the set grew by `by` items at its start.
   *
   * For a host that prepends, which is what a transcript loading its history
   * does. Every index the controller knew now names the item `by` places later,
   * so the heights and the window move with them, and the scroll offset is moved
   * by the room the new items take once they have been drawn. The reader stays
   * on the turn they were reading rather than on whatever now sits at their old
   * offset, which is what loading history upward has to look like.
   *
   * Call it from `willUpdate`, before the render that draws the grown set.
   */
  shift(by: number): void {
    if (by <= 0) {
      return
    }
    const count = Math.max(0, this.options.count())
    this.heights.shift(by)
    const room = this.startOf(by, count)
    this.window = {
      ...this.window,
      before: this.window.before + room,
      first: this.window.first + by,
      last: this.window.last + by,
    }
    this.owed += room
  }

  /**
   * How tall item `index` is: what was measured, or the estimate.
   *
   * For a host that draws an item outside the window, the row holding focus
   * say, and has to take that item's room out of a spacer.
   */
  sizeOf(index: number): number {
    return this.measuring() ? this.heights.at(index) : this.line()
  }

  /**
   * Scrolls the box to show item `index`.
   *
   * By default the least distance that shows it whole, for a host moving focus
   * to an item outside the window, whose own element cannot be scrolled to
   * because it is not drawn where it belongs. `inset` is how far into the box
   * the items start, for a heading that sticks at its top and covers that much
   * of every item scrolled under it.
   *
   * `align` puts the item at the box's `start`, `center` or `end` instead, and
   * `behavior` is the platform's, for a host whose consumer asked to be taken
   * to an item. A smooth scroll moves the window through the box's own
   * `scroll` events, the same as a reader scrolling.
   */
  reveal(index: number, inset = 0, { align = 'nearest', behavior }: RevealOptions = {}): void {
    const box = this.options.container()
    if (!box) {
      return
    }
    const top = this.offsetOf(index)
    const size = this.sizeOf(index)
    const span = this.span(box)
    const at = this.scrolled(box)
    const room = span - inset
    let to: number
    if (align === 'start') {
      to = top
    } else if (align === 'center') {
      to = top - inset - (room - size) / 2
    } else if (align === 'end') {
      to = top + size + inset - span
    } else if (top < at) {
      to = top
    } else if (top + size + inset > at + span) {
      to = top + size + inset - span
    } else {
      return
    }
    const next = Math.max(0, to)
    if (behavior && typeof box.scrollTo === 'function') {
      const across = this.across()
      const rtl = across && getComputedStyle(box).direction === 'rtl'
      box.scrollTo(across ? { behavior, left: rtl ? -next : next } : { behavior, top: next })
    } else {
      this.scrollBox(box, next)
      this.target = index
    }
  }

  /**
   * Where item `index` starts along the scroll axis, in pixels from the top of
   * the set: what was measured above it, or the estimate.
   */
  offsetOf(index: number): number {
    const total = Math.max(0, this.options.count())
    return this.measuring()
      ? this.startOf(index, total) + this.drift
      : Math.max(0, Math.min(index, total)) * this.line()
  }

  /**
   * Drops every measurement, for a host that swapped its data.
   *
   * Not called on a count change, which would be the obvious place and is
   * wrong: appending to a transcript leaves every existing index naming the
   * same item, and forgetting there would re-measure the whole set on every
   * message. A host that replaces its set calls this, because only it knows
   * that index 900 is now a different row.
   */
  forget(): void {
    this.heights.forget()
    this.sample = undefined
    this.uneven = false
    this.square()
  }

  /**
   * Says once that the box cannot be measured, and why.
   *
   * A warning rather than a throw, because the list still works: it holds a
   * window, it draws rows, and a reader can scroll. What it cannot do is choose
   * the window well, and that is the consumer's stylesheet to fix, not
   * something this can decide on their behalf.
   *
   * Once per controller, because a warning per frame is one people filter out
   * and this one has to be believed the day it is right.
   *
   * **The usual cause is a scrolling box with no height of its own.** Its
   * `clientHeight` is then a function of the rows just drawn, so measuring
   * moves what is being measured and the two never agree. The other is rows
   * that report no height, such as a row drawn with `display: contents`, which
   * is a fault in the component that draws them. The message names the
   * element and the part the box is, which is what a consumer's stylesheet
   * reaches: the report prints only the message, and a class name or "the
   * container" told a reader nothing they could select.
   */
  private report(): void {
    if (this.warned) {
      return
    }
    this.warned = true
    const host = this.host as unknown as { localName?: unknown }
    const tag = typeof host.localName === 'string' ? host.localName : undefined
    const part = this.options.container()?.getAttribute('part')?.split(' ')[0]
    reportRuntime({
      kind: 'unsettled-window',
      message:
        tag && part
          ? `The number of rows that fit in the \`${part}\` part of <${tag}> did not settle, which ` +
            'usually means the part has no block size of its own. ' +
            `Give ${tag}::part(${part}) a block size and an overflow.`
          : `The number of rows that fit in ${tag ? `<${tag}>` : 'a windowed list'} did not settle, ` +
            'which usually means the box they scroll in has no block size of its own. Give that ' +
            'box a block size and an overflow.',
      tag,
    })
  }
}
