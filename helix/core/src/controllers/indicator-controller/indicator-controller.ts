import type { ReactiveController, ReactiveControllerHost } from 'lit'

/**
 * What an indicator needs to know, asked for rather than assumed.
 */
export interface IndicatorOptions {
  /** The element that is currently marked, or nothing if none is. */
  active: () => HTMLElement | null | undefined

  /** The traveling mark. Positioned against the surface. */
  indicator: () => HTMLElement | null | undefined

  /**
   * Elements whose own size moves the mark, beyond the host.
   *
   * The host is always watched, and it is not enough on its own: an item can
   * change width inside a strip that keeps its size, and the host never fires
   * for that. So a component hands over its items, and they are watched too.
   *
   * Read again on every placement rather than once, because the set is not
   * settled when the controller connects: a tab strip's tabs have not
   * upgraded by its first update, so a list read then is empty, and watching
   * nothing is silent. Observing the same element twice is a no-op, so the
   * re-read costs nothing and needs no bookkeeping about who is watched.
   */
  observe?: () => readonly Element[]

  /**
   * The box the mark is positioned against, which is its containing block.
   *
   * Not the host. An absolutely positioned element is placed against its
   * containing block's *padding* box, so this has to be whichever element
   * carries `position: relative`, and that is usually a part rather than the
   * host itself.
   */
  surface: () => HTMLElement | null | undefined
}

/**
 * Measures the marked child and writes the geometry onto a traveling mark.
 *
 * Serves `Navigation`, `Tabs`, `Toggle.Group` and `Outline`. The two things
 * hand-written copies of this get wrong:
 *
 * **The inline axis is signed.** In a right-to-left document the distance is
 * measured from the surface's right edge and applied as a negative translation,
 * because the mark travels from the inline start and the inline start is on the
 * right. Measuring from the physical left and applying an unsigned offset from
 * the inline-start edge sends the mark the wrong way in RTL.
 *
 * **The border has to come off both axes.** `getBoundingClientRect` gives the
 * border box and the containing block is the padding box, so a surface with a
 * border of its own puts the mark one border-width out. `clientLeft` and
 * `clientTop` are the border widths, already resolved, which is why they are
 * used here rather than parsing `borderLeftWidth`.
 *
 * **Nothing is written until there is something to measure.** A zero-width box
 * is a component whose children have not upgraded yet, and writing zeroes would
 * park the mark at the origin and leave it there. The `data-placed` attribute is
 * what a stylesheet waits for, so a mark fades in where it belongs rather than
 * sliding from the corner on first paint.
 *
 * The four custom properties are the contract. What a component does with them
 * is its own business, which is how one controller serves a bar under a tab, a
 * pill filling it, and a rule down the side of a contents page.
 *
 * **Declared here because this is what writes them.** `core` ships no CSS, so
 * every reader is outside this package and none of these is private.
 * the `hooks` rule pairs a documented hook with a rule that reads one, in both
 * directions.
 *
 * @cssproperty --indicator-block-size - How tall the active item is, in pixels.
 * @cssproperty --indicator-inline-size - How wide the active item is, in pixels.
 * @cssproperty --indicator-x - Where the active item starts, along the inline axis.
 * @cssproperty --indicator-y - Where the active item starts, along the block axis.
 */
export class IndicatorController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly options: IndicatorOptions

  private resize: ResizeObserver | undefined

  constructor(host: ReactiveControllerHost & HTMLElement, options: IndicatorOptions) {
    this.host = host
    this.options = options
    host.addController(this)
  }

  hostConnected(): void {
    /* The host's own size is not enough: a strip that keeps its width while its
       children rewrap moves every one of them, and a mark measured against the
       old layout is left behind. Observing the host catches both, because a
       rewrap changes its height. */
    this.resize = new ResizeObserver(() => this.place())
    this.resize.observe(this.host)
    this.watch()
  }

  /** Watches whatever `observe` names now, which `place` asks for on every placement. */
  private watch(): void {
    for (const element of this.options.observe?.() ?? []) {
      this.resize?.observe(element)
    }
  }

  hostDisconnected(): void {
    this.resize?.disconnect()
    this.resize = undefined
    /* The host going away is the third way a move can end, and the one nothing
       was watching. A timer holding a closure over a detached element keeps it
       alive for the second it has left to run. */
    this.stopWaiting()
  }

  /** Called after every update, which is when the marked child may have moved. */
  hostUpdated(): void {
    this.place()
  }

  /** Where the mark was last put, so a placement can tell a move from a resize. */
  private last: { x: string; y: string } | undefined

  /** The guard behind `transitionend`, in case it never comes. */
  private settling: ReturnType<typeof setTimeout> | undefined

  /**
   * The listener currently waiting, so the next move can take it off first.
   *
   * **Without this, a move inside a second orphans a listener.** Clearing the
   * timer is not enough on its own: the `transitionend` that would remove the
   * listener never arrives under reduced motion, where there is no transition
   * to end, so a reader changing tabs quickly, or any reader at all with motion
   * reduced, leaves one dead listener per selection on an element that lives as
   * long as the page.
   */
  private waiting: { on: HTMLElement; settle: (event?: TransitionEvent) => void } | undefined

  /*
   * Measures and writes, or gives up without writing anything.
   *
   * Public because `slotchange` is not an update: children arriving is exactly
   * when the first measurement becomes possible, and a component that only
   * placed on its own updates left the mark unplaced for the life of the page.
   */
  place(): void {
    // Before any of the early returns: the items are there to watch whether or
    // not there is anything to measure yet.
    this.watch()
    const indicator = this.options.indicator()
    const surface = this.options.surface()
    const active = this.options.active()
    if (!indicator || !surface) {
      return
    }
    if (!active) {
      // Nothing is marked, so there is nothing to point at. The attribute goes
      // and the stylesheet takes the mark away with it.
      indicator.removeAttribute('data-placed')
      return
    }

    const box = active.getBoundingClientRect()
    const own = surface.getBoundingClientRect()
    if (box.width === 0 && box.height === 0) {
      return
    }

    /* `clientLeft` and `clientTop` are the resolved border widths, which is the
       difference between the border box the measurement gives and the padding
       box the mark is placed against. */
    const rtl = getComputedStyle(surface).direction === 'rtl'
    const inline = rtl
      ? own.right - box.right - surface.clientLeft
      : box.left - own.left - surface.clientLeft

    const x = `${rtl ? -inline : inline}px`
    const y = `${box.top - own.top - surface.clientTop}px`

    /* `data-moving` while it is on its way, so a stylesheet can say something
     * about the travel itself.
     *
     * There is no CSS state for "a transition is running", and the effect this
     * exists for wants one: a mark that swells as it leaves and settles back
     * when it lands reads as a thing being carried rather than a rectangle
     * being repositioned. The controller is the only thing that knows a move
     * has been asked for, so it says so.
     *
     * Only on a *change*, and never on the first placement: the mark arrives by
     * fading in, and swelling on arrival would be an animation about nothing.
     *
     * Cleared on `transitionend` with a timeout behind it. The event is the
     * honest signal and it does not always come: a move under reduced motion
     * has no transition to end, and neither does one whose computed position
     * turns out identical after a resize. A marker that can stick is worse than
     * one that clears a little early. */
    const moved = this.last !== undefined && (this.last.x !== x || this.last.y !== y)
    this.last = { x, y }

    indicator.style.setProperty('--indicator-x', x)
    indicator.style.setProperty('--indicator-y', y)
    indicator.style.setProperty('--indicator-inline-size', `${box.width}px`)
    indicator.style.setProperty('--indicator-block-size', `${box.height}px`)
    indicator.toggleAttribute('data-placed', true)

    if (!moved) {
      return
    }
    indicator.toggleAttribute('data-moving', true)
    this.stopWaiting()
    /* `translate` only. `transitionend` fires once per property, and a
       stylesheet reacting to `data-moving` is very likely to transition
       something shorter than the travel: the outline's mark widens over
       `duration-fast` while it travels over `duration-normal`, so an unfiltered
       listener had the width's own transition end the move that caused it, a
       third of the way through. */
    const settle = (event?: TransitionEvent): void => {
      if (event && event.propertyName !== 'translate') {
        return
      }
      indicator.removeAttribute('data-moving')
      this.stopWaiting()
    }
    indicator.addEventListener('transitionend', settle)
    this.waiting = { on: indicator, settle }
    this.settling = setTimeout(settle, 1000)
  }

  /** Takes the pending listener and its guard off, wherever they came from. */
  private stopWaiting(): void {
    clearTimeout(this.settling)
    this.settling = undefined
    if (this.waiting) {
      this.waiting.on.removeEventListener('transitionend', this.waiting.settle)
      this.waiting = undefined
    }
  }
}
