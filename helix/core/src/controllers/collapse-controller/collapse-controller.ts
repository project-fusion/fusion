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
    const widths = items.map((item) => item.offsetWidth)
    const total = widths.reduce((sum, width) => sum + width, 0)

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

  private set(next: number): void {
    if (this.fits === next) {
      return
    }
    this.fits = next
    this.host.requestUpdate()
  }
}
