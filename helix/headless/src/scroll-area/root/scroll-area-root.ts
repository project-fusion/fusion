import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { type Bar, ScrollbarController } from '../scrollbar-controller.js'

/** Which edges have something past them, as a set of tokens. */
const EDGES = ['block-start', 'block-end', 'inline-start', 'inline-end'] as const

/**
 * @summary A scrolling box that shows which edges have more content past them.
 *
 * @description
 * Measures which edges have content past them and sets one custom state per
 * edge. CSS cannot read scroll position, so a stylesheet cannot work this out
 * on its own. The styled tier draws a fade on each edge that has a state.
 *
 * Custom states keep an element that upgrades after a framework rendered it
 * from adding markup the framework did not write. Select them with
 * `:host(:state(more-block-end))`.
 *
 * While the content overflows, the region gets a `tabindex`, so keyboard users
 * can scroll it. When nothing overflows, it is not a tab stop.
 *
 * It has `role="region"` only when you set a `label`, because a screen reader
 * announces an unnamed region as only "region".
 *
 * **`scrollbars` draws scrollbars of its own** in place of the browser's: a
 * `scrollbar` part for each axis that scrolls, a `thumb` in each, and a
 * `corner` where the two meet. They are for the pointer. The thumb drags, and
 * a press on the track moves the thumb to the press. The viewport stays the
 * tab stop and the region a screen reader reads, and the scrollbars are hidden
 * from screen readers. On the headless tier your stylesheet sizes and places
 * them, hides the browser's own with `scrollbar-width: none` on the viewport,
 * and draws the thumb from the two custom properties written on each
 * scrollbar. An axis whose `overflow` is `hidden` gets no scrollbar.
 *
 * **`orientation` keeps the content to one axis.** `vertical` scrolls up and
 * down only, and `horizontal` sideways only, so the other axis has no
 * scrollbar, the browser's or the component's, and clips what is past it.
 * Leave it unset to scroll both ways.
 *
 * The viewport's `scroll` and `scrollend` are sent again from the host, which
 * is the element you hold. A thumb dragged across the content sends one
 * `scrollend`, once it is let go. In React, bind them with `onScroll` and
 * `onScrollEnd`.
 *
 * **Keyboard.** The viewport is the tab stop while the content overflows, and
 * the browser's scrolling keys move it: the arrow keys, Page Up and Page Down,
 * Home and End, and Space. The scrollbars take no focus.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Scroller, Overflow, Scroll container
 * @documentation https://fusion.dev/helix/components/scroll-area
 *
 * @slot - The content that scrolls.
 *
 * @event {Event} scroll - The content scrolled. Sent from the host, because the viewport's own does not leave the shadow root. Does not bubble.
 * @event {Event} scrollend - The content stopped scrolling. Sent from the host, as `scroll` is, and once for a thumb dragged across the content. Does not bubble.
 *
 * @csspart corner - The square where the two scrollbars meet, under `scrollbars`. Hidden unless both are drawn.
 * @csspart edges - The layer that draws the cues on the inline start and end edges.
 * @csspart scrollbar - Each scrollbar, under `scrollbars`. Hidden on an axis that has none.
 * @csspart scrollbar-horizontal - The scrollbar along the inline axis, alongside `scrollbar`.
 * @csspart scrollbar-vertical - The scrollbar along the block axis, alongside `scrollbar`.
 * @csspart scrollbar-visible - A scrollbar while it is showing, alongside `scrollbar`. Always under `auto` and `always`, and while scrolling, held, or hovered under `scroll` and `hover`.
 * @csspart thumb - The thumb inside each scrollbar, which drags.
 * @csspart thumb-horizontal - The thumb of the horizontal scrollbar, alongside `thumb`.
 * @csspart thumb-vertical - The thumb of the vertical scrollbar, alongside `thumb`.
 * @csspart viewport - The scrolling box.
 *
 * @cssproperty --scroll-area-scroll-fraction - How far along its axis the content is scrolled, from 0 at the start to 1 at the end. Written on each `scrollbar` part, so its thumb inherits it. Counted from the right on a right-to-left page.
 * @cssproperty --scroll-area-thumb-fraction - The share of the track the thumb covers, from 0 to 1, which is how much of the content is in view. Written on each `scrollbar` part.
 *
 * @cssstate more-block-end - While there is more to scroll to past the block end.
 * @cssstate more-block-start - While there is more to scroll back to before the block start.
 * @cssstate more-inline-end - While there is more to scroll to past the inline end.
 * @cssstate more-inline-start - While there is more to scroll back to before the inline start.
 * @cssstate scrollbar-horizontal - While the horizontal scrollbar is drawn, under `scrollbars`.
 * @cssstate scrollbar-vertical - While the vertical scrollbar is drawn, under `scrollbars`.
 * @cssstate scrolls - While the content is larger than the viewport, on either axis.
 */
@customElement('helix-headless-scroll-area')
export class HelixHeadlessScrollArea extends HelixElement {
  /**
   * How long the scrollbars stay after the content stops moving, or the pointer
   * leaves, in milliseconds. Read under `scrollbars="scroll"` and
   * `scrollbars="hover"`.
   */
  @property({ attribute: 'hide-delay', type: Number })
  hideDelay = 600

  /**
   * The region's name, read by screen readers.
   *
   * Without one there is no region: see the note on the class.
   */
  @property()
  label = ''

  /**
   * The one axis the content scrolls along: `vertical` or `horizontal`. The
   * other axis clips what is past it and has no scrollbar. Unset scrolls both.
   */
  @property()
  orientation?: 'horizontal' | 'vertical'

  /**
   * Draws scrollbars of the component's own in place of the browser's, and
   * says when they show.
   *
   * - `auto`: on each axis that has content past it.
   * - `always`: on each axis that can scroll, whether or not it has anything to
   *   scroll, so the scrollbar is there before the content grows.
   * - `scroll`: while the content is moving, and for `hide-delay` after.
   * - `hover`: as `scroll`, and while the pointer is over the scroll area.
   *
   * Absent keeps the browser's scrollbars.
   */
  @property({ reflect: true })
  scrollbars?: 'always' | 'auto' | 'hover' | 'scroll'

  /** The scrollbars drawn under `scrollbars`: what they show, when, and the drag. */
  private readonly bars = new ScrollbarController(this, {
    box: () => this.scroller,
    hideDelay: () => this.hideDelay,
    mode: () => this.scrollbars,
    scrollEnd: () => this.dispatchEvent(new Event('scrollend')),
  })

  /**
   * Which edges have content past them, measured rather than guessed.
   */
  @state()
  private more: string[] = []

  /**
   * Whether there is anything to scroll at all, which decides the tab stop.
   */
  @state()
  private scrolls = false

  private watcher: ResizeObserver | undefined

  /**
   * The element that scrolls. Use it to scroll the content from your code.
   *
   * **Public because the alternative is silence.** The scrolling box is inside
   * this shadow root: a consumer holding a reference to this element holds the
   * host, which does not scroll, and `scrollBy` on it is a no-op that reports
   * nothing. That is how `scrollItemIntoView`'s `offsetParent` default fails
   * here.
   *
   * The element rather than a method of our own, because the utilities that
   * want it already take one.
   */
  get scroller(): HTMLElement | null {
    return this.partNamed('viewport')
  }

  /**
   * Reads the four edges off the box.
   *
   * A pixel of slack on each, because a scroller at its end is routinely a
   * fraction short of it: browsers round scroll positions differently under
   * zoom and on a display that is not at one to one, and a fade that never
   * quite goes out at the bottom of a fully scrolled list is the bug that
   * costs.
   */
  private measure = (): void => {
    const box = this.scroller
    if (!box) {
      return
    }
    const slack = 1
    /* An axis `orientation` takes away has no edges with more past them: the
       content is clipped there, and a fade would promise a scroll that never
       comes. */
    const block = this.orientation !== 'horizontal'
    const inline = this.orientation !== 'vertical'
    const found: string[] = []
    if (block && box.scrollTop > slack) {
      found.push('block-start')
    }
    if (block && box.scrollTop + box.clientHeight < box.scrollHeight - slack) {
      found.push('block-end')
    }
    /* How far from the inline start, whichever side that is. A right-to-left
       scroller counts `scrollLeft` down from zero, and read as a count up its
       start never had more and its end always did, however far the reader had
       scrolled. */
    const along = Math.abs(box.scrollLeft)
    if (inline && along > slack) {
      found.push('inline-start')
    }
    if (inline && along + box.clientWidth < box.scrollWidth - slack) {
      found.push('inline-end')
    }
    this.more = found
    this.scrolls =
      (block && box.scrollHeight > box.clientHeight) ||
      (inline && box.scrollWidth > box.clientWidth)
    if (this.scrollbars) {
      this.bars.read(box)
    }
  }

  /** Measures, shows the scrollbars, and sends the event on from the host. */
  private readonly handleScroll = (event: Event): void => {
    this.measure()
    this.bars.wake()
    this.relayNativeEvent(event)
  }

  /** Sends the event on from the host, except the ones a thumb drag holds back. */
  private readonly handleScrollEnd = (event: Event): void => {
    if (!this.bars.holdsScrollEnd()) {
      this.relayNativeEvent(event)
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* Both the box and what is in it. The box changing size is a layout change
       and the content changing size is a data change; a fade answering only one
       of them is wrong every time a list is filtered. */
    this.watcher = new ResizeObserver(this.measure)
    /* And what it watches, which rebuilding the observer does not restore. A
     * fresh observer watches nothing until something calls `observe`, so a
     * scroll area moved in the DOM comes back registered on no targets: the
     * fades stop answering a resize or a filtered list, and the component goes
     * on rendering.
     *
     * Guarded on `hasUpdated`, because the first connection happens before the
     * first render and there is no scroller to find yet. */
    if (this.hasUpdated) {
      this.watchContent()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.watcher?.disconnect()
    this.watcher = undefined
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated?.(changed)
    this.watchContent()
    this.measure()
  }

  /** Registers the box and everything slotted into it, which is what resizes. */
  private watchContent(): void {
    const box = this.scroller
    if (!box || !this.watcher) {
      return
    }
    this.watcher.observe(box)
    for (const child of box.querySelectorAll('slot')) {
      for (const assigned of child.assignedElements({ flatten: true })) {
        this.watcher.observe(assigned)
      }
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    /* Turned on after the first measurement, which read no scrollbars. */
    if (changed.has('orientation') && this.hasUpdated) {
      this.measure()
    } else if (changed.has('scrollbars') && this.scrollbars) {
      const box = this.scroller
      if (box) {
        this.bars.read(box)
      }
    }
    /* On the host rather than the viewport, so a consumer can style from the
       outside without reaching through a part.

       **Custom states and never attributes, which is what keeps hydration
       clean.** These are a reading of a laid-out box, so they are written on
       upgrade, and upgrade happens before a framework hydrates the subtree
       around it. Written as attributes they are markup on the host that the
       framework did not render: React reported a hydration mismatch naming
       `data-scrolls` and `data-more` on every load of a page holding one.
       `states` is not in the DOM at all, so this element may upgrade whenever it
       likes and a framework finds the markup it rendered. That is the rule the
       rest of the library already keeps, `app-header`'s `scrolled` being the
       clearest statement of it.

       One state per edge rather than one holding tokens, because a custom state
       is a name and not a value: there is no `~=` to ask with. The four
       selectors are what the styled tier writes either way. */
    /* Through `toggleState` for the feature test it carries. This is `updated`
       rather than `willUpdate`, so the server never reaches it, but Safari
       below 17.4 and Firefox below 126 do and have no `CustomStateSet`.

       Four calls rather than a loop over `EDGES`, because a state is read from
       the source as a literal, the way a part is: `more-${edge}` is a name
       nothing can pair with its `@cssstate`. */
    this.toggleState('scrolls', this.scrolls)
    this.toggleState('more-block-start', this.more.includes('block-start'))
    this.toggleState('more-block-end', this.more.includes('block-end'))
    this.toggleState('more-inline-start', this.more.includes('inline-start'))
    this.toggleState('more-inline-end', this.more.includes('inline-end'))
    const drawn = this.scrollbars ? this.bars.bars : undefined
    this.toggleState('scrollbar-horizontal', drawn?.horizontal.drawn === true)
    this.toggleState('scrollbar-vertical', drawn?.vertical.drawn === true)
  }

  private readonly handleSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement
    for (const assigned of slot.assignedElements({ flatten: true })) {
      this.watcher?.observe(assigned)
    }
    this.measure()
  }

  /** The axis `orientation` takes away, clipped where the content would overflow it. */
  private get clipped(): string | typeof nothing {
    if (this.orientation === 'vertical') {
      return 'overflow-x: hidden'
    }
    return this.orientation === 'horizontal' ? 'overflow-y: hidden' : nothing
  }

  protected override render(): TemplateResult {
    return html`<div
      data-scroller
      part="viewport"
      style=${this.clipped}
      role=${this.label ? 'region' : nothing}
      aria-label=${this.label || nothing}
      tabindex=${this.scrolls ? '0' : nothing}
      @scroll=${this.handleScroll}
      @scrollend=${this.handleScrollEnd}
    >
      <slot @slotchange=${this.handleSlotChange}></slot>
    </div>
    <!-- The block edges are drawn on the host, which has two pseudo-elements and
         no more. The sideways pair needs two of its own, and an element to hang
         them on is cheaper than the arithmetic that would fit four edges into
         two: they can then be placed with logical properties, which is what
         makes inline-start the right-hand edge when the reader reads that way. -->
    <div
      part="edges"
      aria-hidden="true"
    ></div>${this.scrollbars ? this.renderScrollbars() : nothing}`
  }

  /**
   * The scrollbars, the thumbs in them and the corner.
   *
   * **For the pointer, and hidden from everything else.** The viewport is
   * already the tab stop and the region, and the keys scroll it, so a second
   * way in would be one more stop that does the same thing. The scrollbars
   * carry `aria-hidden` and take no focus, as Radix's do.
   *
   * Hidden on the server, which cannot measure whether there is anything to
   * scroll, and until the first measurement.
   */
  private renderScrollbars(): TemplateResult {
    const controller = this.bars
    const bars = controller.bars
    const shown = controller.shown
    const facts = (bar: Bar | undefined): string | typeof nothing =>
      bar
        ? `--scroll-area-thumb-fraction: ${bar.thumb}; --scroll-area-scroll-fraction: ${bar.along}`
        : nothing
    const vertical = bars?.vertical.drawn === true
    const horizontal = bars?.horizontal.drawn === true
    return html`<div
        part="scrollbar scrollbar-vertical${vertical && shown ? ' scrollbar-visible' : ''}"
        aria-hidden="true"
        ?hidden=${!vertical}
        style=${facts(bars?.vertical)}
        @pointerdown=${controller.handleVerticalDown}
        @pointermove=${controller.handleDragMove}
        @pointerup=${controller.handleDragEnd}
        @pointercancel=${controller.handleDragEnd}
        @lostpointercapture=${controller.handleDragEnd}
        @pointerenter=${controller.handleBarEnter}
        @pointerleave=${controller.handleBarLeave}
      >
        <div part="thumb thumb-vertical"></div>
      </div>
      <div
        part="scrollbar scrollbar-horizontal${horizontal && shown ? ' scrollbar-visible' : ''}"
        aria-hidden="true"
        ?hidden=${!horizontal}
        style=${facts(bars?.horizontal)}
        @pointerdown=${controller.handleHorizontalDown}
        @pointermove=${controller.handleDragMove}
        @pointerup=${controller.handleDragEnd}
        @pointercancel=${controller.handleDragEnd}
        @lostpointercapture=${controller.handleDragEnd}
        @pointerenter=${controller.handleBarEnter}
        @pointerleave=${controller.handleBarLeave}
      >
        <div part="thumb thumb-horizontal"></div>
      </div>
      <div
        part="corner"
        aria-hidden="true"
        ?hidden=${!(vertical && horizontal)}
      ></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-scroll-area': HelixHeadlessScrollArea
  }
}

export { EDGES }
