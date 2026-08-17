import type { ReactiveController, ReactiveControllerHost } from 'lit'

/**
 * What an indicator needs to know, asked for rather than assumed.
 */
export interface IndicatorOptions {
  /** The element that is currently marked, or nothing if none is. */
  active: () => HTMLElement | null | undefined

  /** The travelling mark. Positioned against the surface. */
  indicator: () => HTMLElement | null | undefined

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
 * Measures the marked child and writes the geometry onto a travelling mark.
 *
 * **Four components had written this and the copies had diverged.** `NavBar`,
 * `Tabs`, `Toggle.Group` and `PageNav` each measured an active child and wrote
 * a position onto an indicator, and two of them had bugs the others did not.
 * `PageNav`'s own comment counted the repetition rather than resolving it, and
 * the audit found the same shape independently in all four.
 *
 * What the copies disagreed about, and what this settles:
 *
 * **The inline axis is signed.** In a right-to-left document the distance is
 * measured from the surface's right edge and applied as a negative translation,
 * because the mark travels from the inline start and the inline start is on the
 * right. `NavBar` measured from the physical left and applied it from the
 * inline-start edge with an unsigned offset, so its marker went the wrong way
 * in RTL. That is the bug this extraction exists to stop repeating.
 *
 * **The border has to come off both axes.** `getBoundingClientRect` gives the
 * border box and the containing block is the padding box, so a surface with a
 * border of its own puts the mark one border-width out. `Tabs` and
 * `Toggle.Group` each did this arithmetic separately, `PageNav` did the block
 * half with `clientTop`, and `NavBar` did neither. `clientLeft` and `clientTop`
 * are the border widths, already resolved, which is why they are used here
 * rather than parsing `borderLeftWidth`.
 *
 * **Nothing is written until there is something to measure.** A zero-width box
 * is a component whose children have not upgraded yet, and writing zeroes would
 * park the mark at the origin and leave it there. The `data-placed` attribute is
 * what a stylesheet waits for, so a mark fades in where it belongs rather than
 * sliding from the corner on first paint.
 *
 * The four custom properties are the contract: `--_indicator-x`, `-y`, `-w` and
 * `-h`. What a component does with them is its own business, which is how one
 * controller serves a bar under a tab, a pill filling it, and a rule down the
 * side of a contents page.
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
  }

  hostDisconnected(): void {
    this.resize?.disconnect()
    this.resize = undefined
  }

  /** Called after every update, which is when the marked child may have moved. */
  hostUpdated(): void {
    this.place()
  }

  /**
   * Measures and writes, or gives up without writing anything.
   *
   * Public because `slotchange` is not an update: children arriving is exactly
   * when the first measurement becomes possible, and a component that only
   * placed on its own updates left the mark unplaced for the life of the page.
   */
  place(): void {
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

    indicator.style.setProperty('--_indicator-x', `${rtl ? -inline : inline}px`)
    indicator.style.setProperty('--_indicator-y', `${box.top - own.top - surface.clientTop}px`)
    indicator.style.setProperty('--_indicator-w', `${box.width}px`)
    indicator.style.setProperty('--_indicator-h', `${box.height}px`)
    indicator.toggleAttribute('data-placed', true)
  }
}
