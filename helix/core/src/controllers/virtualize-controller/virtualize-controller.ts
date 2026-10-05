import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { reportRuntime } from '../../utils/report-runtime/report-runtime.js'
import { Heights } from './heights.js'

/** What the controller needs of a set and the box it is shown in. */
export interface VirtualizeOptions {
  /** The scrolling box, or null before it renders. */
  container: () => HTMLElement | null | undefined
  /** How many items there are in total, shown or not. */
  count: () => number
  /** How tall one item is along the scroll axis, in pixels. */
  estimate: () => number
  /**
   * Rows kept either side of what fits, so a scroll reveals something drawn
   * rather than something blank. Four by default, which is roughly a frame of
   * fast scrolling at a 32 pixel row.
   */
  overscan?: number
  /**
   * The rendered rows, in window order, for a set whose items differ in height.
   *
   * **Supplying this is what turns measurement on**, and leaving it off keeps
   * the straight line the note below defends. A host that returns its row
   * elements gets each one measured after it renders and placed by what it
   * came to; a host that returns nothing gets every item at `estimate`, which
   * is right whenever the rows really are uniform and is cheaper.
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

  constructor(host: ReactiveControllerHost, options: VirtualizeOptions) {
    this.host = host
    this.options = options
    this.heights = new Heights(() => this.options.estimate())
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
    this.options.container()?.removeEventListener('scroll', this.handleScroll)
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
    box.addEventListener('scroll', this.handleScroll, { passive: true })
    /* Takes the box out of the browser's scroll anchoring, through a rule
       `HelixElement` ships into every shadow root. See `VIRTUAL` there. */
    box.setAttribute('data-virtual', '')
    this.watching = true
  }

  /* `passive`, because this never calls `preventDefault` and saying so lets the
     browser scroll without waiting to find out. */
  private readonly handleScroll = (): void => {
    // A reader moved, which is the one input this exists to answer.
    this.settling = 0
    this.measure()
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
    const size = Math.max(1, this.options.estimate())
    if (!box) {
      return
    }
    const overscan = this.options.overscan ?? 4
    const next = this.measuring()
      ? this.placed(box, total, overscan)
      : this.uniform(box, total, size, overscan)
    /* The host's own numbers changing is an outside cause, the same as a scroll
       or a resize: a set that grew is not this controller chasing itself. */
    if (this.last?.count !== total || this.last.estimate !== size) {
      this.last = { count: total, estimate: size }
      this.settling = 0
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

  /** The straight line: one estimate, so offset and index convert by division. */
  private uniform(box: HTMLElement, total: number, size: number, overscan: number): Window {
    /* Held to the set, for an offset left past the end of a set that shrank:
       the box clamps its offset a frame later, and a window starting past the
       last item until then moved on every pass. */
    const first = Math.max(0, Math.min(Math.floor(box.scrollTop / size), total) - overscan)
    const fits = Math.ceil(box.clientHeight / size) + overscan * 2
    const last = Math.min(total, first + fits)
    return { after: Math.max(0, (total - last) * size), before: first * size, first, last }
  }

  /** Whether this pass places by measurement: offered, and wanted. */
  private measuring(): boolean {
    return this.options.rows !== undefined && (this.options.measured?.() ?? true)
  }

  /**
   * The measured version, which asks where each item starts rather than dividing.
   *
   * The scan for `last` walks forward from `first` rather than searching,
   * because it stops at the bottom of the viewport: it is bounded by what fits
   * on screen plus the overscan, whatever the set's length.
   */
  private placed(box: HTMLElement, total: number, overscan: number): Window {
    const first = Math.max(0, this.heights.indexAt(box.scrollTop, total) - overscan)
    const bottom = box.scrollTop + box.clientHeight
    let last = this.heights.indexAt(box.scrollTop, total)
    while (last < total && this.heights.before(last, total) < bottom) {
      last += 1
    }
    last = Math.min(total, last + overscan)
    return {
      after: Math.max(0, this.heights.total(total) - this.heights.before(last, total)),
      before: this.heights.before(first, total),
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
    const top = Math.max(0, box.scrollTop)
    const bottom = top + box.clientHeight
    if (!this.measuring()) {
      const size = Math.max(1, this.options.estimate())
      const first = Math.min(Math.floor(top / size), total)
      return { first, last: Math.max(first, Math.min(total, Math.ceil(bottom / size))) }
    }
    const first = this.heights.indexAt(top, total)
    let last = first
    while (last < total && this.heights.before(last, total) < bottom) {
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
    const total = Math.max(0, this.options.count())
    if (!box) {
      return 0
    }
    const length = this.measuring()
      ? this.heights.total(total)
      : total * Math.max(1, this.options.estimate())
    return Math.max(0, length - Math.max(0, box.scrollTop) - box.clientHeight)
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
        box.scrollTop += this.owed
      }
      this.owed = 0
    }
    if (!this.measuring()) {
      return
    }
    const rows = this.options.rows?.()
    if (!rows) {
      return
    }
    const total = Math.max(0, this.options.count())
    const was = this.heights.before(this.window.first, total)
    let news = false
    for (const { element, index } of rows) {
      if (this.heights.record(index, element.getBoundingClientRect().height)) {
        news = true
      }
    }
    if (!news) {
      return
    }
    /* An outside cause, on the same terms as a resize: the set told this
       something it did not know. Bounded, per the note above. */
    this.settling = 0
    const box = this.options.container()
    const now = this.heights.before(this.window.first, total)
    if (box && box.scrollTop > 0 && now !== was) {
      box.scrollTop += now - was
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
    const room = this.heights.before(by, count)
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
    return this.measuring() ? this.heights.at(index) : Math.max(1, this.options.estimate())
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
    const room = box.clientHeight - inset
    let to: number
    if (align === 'start') {
      to = top
    } else if (align === 'center') {
      to = top - inset - (room - size) / 2
    } else if (align === 'end') {
      to = top + size + inset - box.clientHeight
    } else if (top < box.scrollTop) {
      to = top
    } else if (top + size + inset > box.scrollTop + box.clientHeight) {
      to = top + size + inset - box.clientHeight
    } else {
      return
    }
    const next = Math.max(0, to)
    if (behavior && typeof box.scrollTo === 'function') {
      box.scrollTo({ behavior, top: next })
    } else {
      box.scrollTop = next
    }
  }

  /**
   * Where item `index` starts along the scroll axis, in pixels from the top of
   * the set: what was measured above it, or the estimate.
   */
  offsetOf(index: number): number {
    const total = Math.max(0, this.options.count())
    return this.measuring()
      ? this.heights.before(index, total)
      : Math.max(0, Math.min(index, total)) * Math.max(1, this.options.estimate())
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
   */
  private report(): void {
    if (this.warned) {
      return
    }
    this.warned = true
    const host = this.host as unknown as { localName?: unknown }
    reportRuntime({
      kind: 'unsettled-window',
      message:
        `VirtualizeController: the window did not settle in ${UNSTABLE} passes, so it is holding ` +
        'the last one. That happens when the scrolling box has no height of its own: its ' +
        '`clientHeight` is then a function of the rows just drawn, so measuring moves what is ' +
        'being measured and the two never agree. Give the container a block size and an ' +
        'overflow, which is what the styled tier does and what a headless consumer has to. ' +
        'It also happens when the rows report no height, such as a row drawn with ' +
        '`display: contents`, which is a fault in the component that draws them.',
      tag: typeof host.localName === 'string' ? host.localName : undefined,
    })
  }
}
