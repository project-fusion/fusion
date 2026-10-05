import {
  capturePointer,
  customElement,
  DelayController,
  HelixElement,
  isRtl,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import {
  type Extent,
  hasScrollbar,
  offsetAt,
  type Scrollbars,
  scrollFraction,
  scrollPerPixel,
  showsScrollbar,
  thumbFraction,
} from '../scrollbar.js'

/** Which edges have something past them, as a set of tokens. */
const EDGES = ['block-start', 'block-end', 'inline-start', 'inline-end'] as const

/** The two axes a scrollbar runs along. */
type Axis = 'horizontal' | 'vertical'

/** What one drawn scrollbar shows: whether it is there, and its thumb's facts. */
interface Bar {
  /** Whether the axis has a scrollbar at all. See `hasScrollbar`. */
  drawn: boolean
  /** How far along the axis is scrolled, from 0 to 1. */
  along: number
  /** The share of the track the thumb covers, from 0 to 1. */
  thumb: number
}

/** A thumb being dragged, from where it was taken. */
interface Drag {
  axis: Axis
  /** The offset the axis was at when the drag began, or where a press on the track sent it. */
  from: number
  /** How far the content moves for each pixel the pointer moves. */
  perPixel: number
  /** The pointer's coordinate along the axis when the drag began. */
  pointer: number
  /** `-1` where moving the pointer right moves the thumb toward the start, on a right-to-left page. */
  sign: number
}

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
 * The viewport's `scroll` and `scrollend` are sent again from the host, which
 * is the element you hold. In React, bind them with `onScroll` and
 * `onScrollEnd`.
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
 * @event {Event} scrollend - The content stopped scrolling. Sent from the host, as `scroll` is. Does not bubble.
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

  /** What each scrollbar shows, measured, and `undefined` until it has been. */
  @state()
  private bars: Record<Axis, Bar> | undefined

  /** Whether the content moved, or the pointer left, within the hide delay. */
  @state()
  private active = false

  /** Whether the pointer is over the scroll area. */
  @state()
  private hovered = false

  /** Whether the pointer is over a scrollbar. */
  @state()
  private over = false

  /** The thumb being dragged, if one is. */
  private drag: Drag | undefined

  /** Puts the scrollbars away once nothing has moved for the hide delay. */
  private readonly hide = new DelayController(this, { renders: false })

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
    const found: string[] = []
    if (box.scrollTop > slack) {
      found.push('block-start')
    }
    if (box.scrollTop + box.clientHeight < box.scrollHeight - slack) {
      found.push('block-end')
    }
    /* How far from the inline start, whichever side that is. A right-to-left
       scroller counts `scrollLeft` down from zero, and read as a count up its
       start never had more and its end always did, however far the reader had
       scrolled. */
    const along = Math.abs(box.scrollLeft)
    if (along > slack) {
      found.push('inline-start')
    }
    if (along + box.clientWidth < box.scrollWidth - slack) {
      found.push('inline-end')
    }
    this.more = found
    this.scrolls = box.scrollHeight > box.clientHeight || box.scrollWidth > box.clientWidth
    if (this.scrollbars) {
      this.readBars(box)
    }
  }

  /** One axis of the box, counted from its start whichever way the line runs. */
  private extent(box: HTMLElement, axis: Axis): Extent {
    return axis === 'vertical'
      ? { client: box.clientHeight, offset: box.scrollTop, scroll: box.scrollHeight }
      : { client: box.clientWidth, offset: Math.abs(box.scrollLeft), scroll: box.scrollWidth }
  }

  /**
   * Reads what each scrollbar shows off the box.
   *
   * An axis scrolls unless its `overflow` says it cannot. An empty reading is a
   * harness with no layout, where the mark `core` puts on the viewport is
   * `overflow: auto` on both axes, so it counts as one that scrolls.
   *
   * Written only on a change, so a scroll that moves no thumb renders nothing.
   */
  private readBars(box: HTMLElement): void {
    const mode = this.scrollbars ?? 'auto'
    const style = getComputedStyle(box)
    const bar = (axis: Axis, overflow: string): Bar => {
      const extent = this.extent(box, axis)
      return {
        along: scrollFraction(extent),
        drawn: hasScrollbar(
          mode,
          !['clip', 'hidden', 'visible'].includes(overflow),
          extent.offset > 1 || extent.client < extent.scroll - 1,
        ),
        thumb: thumbFraction(extent),
      }
    }
    const next = {
      horizontal: bar('horizontal', style.overflowX),
      vertical: bar('vertical', style.overflowY),
    }
    if (JSON.stringify(next) !== JSON.stringify(this.bars)) {
      this.bars = next
    }
  }

  /**
   * Shows the scrollbars and starts the wait that puts them away again, under
   * `scroll` and `hover`.
   */
  private wake(): void {
    if (this.scrollbars !== 'scroll' && this.scrollbars !== 'hover') {
      return
    }
    this.active = true
    this.hide.start(this.hideDelay, () => {
      this.active = false
    })
  }

  /** Sends the content to `offset` along an axis, counted from its start. */
  private scrollAlong(box: HTMLElement, axis: Axis, offset: number): void {
    box.scrollTo(
      axis === 'vertical'
        ? { behavior: 'instant', top: offset }
        : { behavior: 'instant', left: isRtl(box) ? -offset : offset },
    )
  }

  /**
   * Takes hold of a thumb, or presses the track.
   *
   * A press on the track sends the thumb's middle to the press first, and the
   * drag carries on from there, so a press and a drag are one gesture as they
   * are on the browser's own scrollbar. `preventDefault` keeps the press from
   * starting a text selection, and from moving focus off the viewport.
   */
  private grab(event: PointerEvent, axis: Axis): void {
    const box = this.scroller
    const bar = event.currentTarget as HTMLElement
    const thumb = bar.querySelector<HTMLElement>('[part~="thumb"]')
    if (event.button !== 0 || !box || !thumb) {
      return
    }
    event.preventDefault()
    const vertical = axis === 'vertical'
    const rtl = !vertical && isRtl(box)
    const track = bar.getBoundingClientRect()
    const held = thumb.getBoundingClientRect()
    const length = vertical ? track.height : track.width
    const size = vertical ? held.height : held.width
    const extent = this.extent(box, axis)
    const pointer = vertical ? event.clientY : event.clientX
    let from = extent.offset
    if (!thumb.contains(event.target as Node)) {
      const along = vertical
        ? pointer - track.top
        : rtl
          ? track.right - pointer
          : pointer - track.left
      from = offsetAt(extent, along, length, size)
      this.scrollAlong(box, axis, from)
    }
    this.drag = {
      axis,
      from,
      perPixel: scrollPerPixel(extent, length, size),
      pointer,
      sign: rtl ? -1 : 1,
    }
    capturePointer(bar, event.pointerId)
    this.requestUpdate()
  }

  private readonly handleVerticalDown = (event: PointerEvent): void => {
    this.grab(event, 'vertical')
  }

  private readonly handleHorizontalDown = (event: PointerEvent): void => {
    this.grab(event, 'horizontal')
  }

  /** Moves the content with a dragged thumb. Nothing while no thumb is held. */
  private readonly handleDragMove = (event: PointerEvent): void => {
    const drag = this.drag
    const box = this.scroller
    if (!drag || !box) {
      return
    }
    const pointer = drag.axis === 'vertical' ? event.clientY : event.clientX
    this.scrollAlong(
      box,
      drag.axis,
      drag.from + (pointer - drag.pointer) * drag.sign * drag.perPixel,
    )
  }

  private readonly handleDragEnd = (): void => {
    if (!this.drag) {
      return
    }
    this.drag = undefined
    this.wake()
    this.requestUpdate()
  }

  private readonly handleBarEnter = (): void => {
    this.over = true
  }

  private readonly handleBarLeave = (): void => {
    this.over = false
    this.wake()
  }

  private readonly handleEnter = (): void => {
    this.hovered = true
  }

  private readonly handleLeave = (): void => {
    this.hovered = false
    if (this.scrollbars === 'hover') {
      this.wake()
    }
  }

  /** Measures, shows the scrollbars, and sends the event on from the host. */
  private readonly handleScroll = (event: Event): void => {
    this.measure()
    this.wake()
    this.relayNativeEvent(event)
  }

  private readonly handleScrollEnd = (event: Event): void => {
    this.relayNativeEvent(event)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('pointerenter', this.handleEnter)
    this.addEventListener('pointerleave', this.handleLeave)
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
    this.removeEventListener('pointerenter', this.handleEnter)
    this.removeEventListener('pointerleave', this.handleLeave)
    this.watcher?.disconnect()
    this.watcher = undefined
    /* The wait was canceled on the way out, so nothing would put the
       scrollbars away again. */
    this.drag = undefined
    this.active = false
    this.hovered = false
    this.over = false
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
    if (changed.has('scrollbars') && this.hasUpdated && this.scrollbars) {
      const box = this.scroller
      if (box) {
        this.readBars(box)
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
    const drawn = this.scrollbars ? this.bars : undefined
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

  protected override render(): TemplateResult {
    return html`<div
      data-scroller
      part="viewport"
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
    ></div>${this.scrollbars ? this.renderScrollbars(this.scrollbars) : nothing}`
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
  private renderScrollbars(mode: Scrollbars): TemplateResult {
    const bars = this.bars
    const moment = {
      active: this.active,
      held: this.over || this.drag !== undefined,
      hovered: this.hovered,
    }
    const shown = showsScrollbar(mode, moment)
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
        @pointerdown=${this.handleVerticalDown}
        @pointermove=${this.handleDragMove}
        @pointerup=${this.handleDragEnd}
        @pointercancel=${this.handleDragEnd}
        @lostpointercapture=${this.handleDragEnd}
        @pointerenter=${this.handleBarEnter}
        @pointerleave=${this.handleBarLeave}
      >
        <div part="thumb thumb-vertical"></div>
      </div>
      <div
        part="scrollbar scrollbar-horizontal${horizontal && shown ? ' scrollbar-visible' : ''}"
        aria-hidden="true"
        ?hidden=${!horizontal}
        style=${facts(bars?.horizontal)}
        @pointerdown=${this.handleHorizontalDown}
        @pointermove=${this.handleDragMove}
        @pointerup=${this.handleDragEnd}
        @pointercancel=${this.handleDragEnd}
        @lostpointercapture=${this.handleDragEnd}
        @pointerenter=${this.handleBarEnter}
        @pointerleave=${this.handleBarLeave}
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
