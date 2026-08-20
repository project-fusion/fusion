import type { ReactiveController, ReactiveControllerHost } from 'lit'

/** What a collapsing container needs to know, asked for rather than assumed. */
export interface CollapseOptions {
  /** The box the items must fit inside. */
  container: () => HTMLElement | null | undefined

  /** The items, in the order they are read. */
  items: () => readonly HTMLElement[]

  /**
   * What the trigger costs when it is showing.
   *
   * Measured rather than guessed where possible, but it cannot be measured
   * before it exists: a container that fits exactly needs no trigger, and
   * showing one would make it not fit. So the width is asked for and the
   * arithmetic is done before anything is hidden.
   */
  trigger: () => HTMLElement | null | undefined
}

/**
 * Decides which children do not fit, so a container can collapse the rest.
 *
 * **Deliberately not a `<helix-resize-observer>`.** It reacts to lifecycle and
 * introduces no property or method a consumer sets, which is the line this
 * library draws between a controller and a component. An element that draws
 * nothing and holds nothing would be a tag whose only purpose is to give a
 * template language an API that JSX already has.
 *
 * **It reports, and never writes.** The host decides what hiding means: a
 * breadcrumb trail hides the middle and keeps the ends, a toolbar might hide
 * from one end, and a tab bar might scroll instead. Writing `hidden` from here
 * would settle that for everyone, and settle it wrong for two of the three.
 *
 * **Always measures the full set.** The obvious build hides an item, remeasures
 * and hides another until it fits, which is a loop over a layout that changes
 * under it and which cannot ever expand again: once an item is hidden it no
 * longer contributes a width, so the container looks like it fits and nothing
 * is ever restored. So every item's width is taken while all of them are shown,
 * and what fits is arithmetic on numbers that do not move.
 *
 * **Client only, and that is the contract rather than a limitation.** There is
 * no width on a server, so the host renders every item and this only ever takes
 * some away. A reader with no JavaScript gets the whole set, which is the right
 * answer, and the enhancement is unable to leave them with less than that.
 */
export class CollapseController implements ReactiveController {
  private observer: ResizeObserver | undefined

  /**
   * Each item's width, taken while every item was showing.
   *
   * Cached because a hidden item measures zero, and the arithmetic needs the
   * width it *would* have. Recomputing from the live tree after anything is
   * hidden is how a collapsed container decides it now fits, un-hides
   * everything, decides it does not, and oscillates.
   *
   * Keyed by element, so an item leaving takes its entry with it and an item
   * arriving has none until it is seen at full width.
   */
  private widths = new WeakMap<HTMLElement, number>()

  /** A pending retry, so a run of updates schedules one frame and not twelve. */
  private retry: number | undefined

  /**
   * How many items fit, counted from the *end*.
   *
   * The end rather than the start, because what collapses keeps its outermost
   * items: a trail keeps where you are, and a path keeps its root. The host
   * pairs this with however many it keeps at the front.
   */
  fits = Number.POSITIVE_INFINITY

  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly options: CollapseOptions,
  ) {
    host.addController(this)
  }

  hostConnected(): void {
    /* Guarded, because the server has no `ResizeObserver` and a component must
       render there. The check is on the constructor rather than on `window`,
       which the shim does provide. */
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    this.observer = new ResizeObserver(() => this.measure())
    const box = this.options.container()
    if (box) {
      this.observer.observe(box)
    }
  }

  hostDisconnected(): void {
    this.observer?.disconnect()
    this.observer = undefined
    if (this.retry !== undefined) {
      cancelAnimationFrame(this.retry)
      this.retry = undefined
    }
  }

  /**
   * Recomputes what fits, from widths taken while everything is shown.
   *
   * The host calls this after its own update as well, because an item arriving
   * or leaving changes the answer and no resize accompanies it.
   */
  measure(): void {
    const box = this.options.container()
    const items = this.options.items()
    if (!box || items.length === 0) {
      return
    }

    const available = box.clientWidth

    /* Remembered while showing, read back while hidden.
     *
     * **The container only is observed, and this cache is why.** Watching the
     * items as well looks like the fix for measuring before they have upgraded,
     * and it closes a loop instead: hiding an item changes its size, the
     * observer sees it, the measurement runs, and the measurement is what
     * hides. Measured as a browser that stopped responding.
     *
     * So a width is recorded the first time an item is seen with one and reused
     * forever after. A hidden item reports zero and its remembered width is
     * what the arithmetic uses, which is also what makes expanding possible: a
     * container that grows still knows what its hidden items cost. */
    const widths = items.map((item) => {
      const live = item.offsetWidth
      if (live > 0) {
        this.widths.set(item, live)
        return live
      }
      return this.widths.get(item) ?? 0
    })
    const total = widths.reduce((sum, width) => sum + width, 0)

    /* Nothing has a width yet, which is not the same as everything fitting.
       Concluding "it fits" from an unlaid-out tree is how this reported a full
       trail inside a container half its width. Say nothing and ask again next
       frame, by which time layout has happened. */
    if (total === 0) {
      this.schedule()
      return
    }

    /* Everything fits, so nothing is hidden and the trigger costs nothing. A
       container that has just grown passes through here and restores itself,
       which is the case the hide-and-remeasure build cannot reach. */
    if (total <= available) {
      this.set(Number.POSITIVE_INFINITY)
      return
    }

    /* Room for the trigger comes off the top, since it will be showing in every
       branch below this one. */
    const budget = available - (this.options.trigger()?.offsetWidth ?? 0)

    let used = 0
    let count = 0
    for (let index = items.length - 1; index >= 0; index--) {
      const width = widths[index] ?? 0
      if (used + width > budget) {
        break
      }
      used += width
      count++
    }

    /* One at minimum. A container narrower than its own last item still shows
       that item and overflows, which is a visible truth; showing none of them
       and only a trigger is a control with nothing to say. */
    this.set(Math.max(1, count))
  }

  /**
   * One retry per frame, however many updates asked for it.
   *
   * The host measures from `updated`, which runs inside Lit's update and so
   * before layout: on the first pass every child is zero wide, and with only
   * the container observed nothing else will ever fire. A frame is exactly the
   * wait, because layout has happened by the time one is delivered.
   */
  private schedule(): void {
    if (this.retry !== undefined || typeof requestAnimationFrame === 'undefined') {
      return
    }
    this.retry = requestAnimationFrame(() => {
      this.retry = undefined
      this.measure()
    })
  }

  private set(next: number): void {
    if (this.fits === next) {
      return
    }
    this.fits = next
    this.host.requestUpdate()
  }
}
