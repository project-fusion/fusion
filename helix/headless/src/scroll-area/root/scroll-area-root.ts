import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/** Which edges have something past them, as a set of tokens. */
const EDGES = ['block-start', 'block-end', 'inline-start', 'inline-end'] as const

/**
 * @summary A scrolling box that says there is more.
 *
 * @description
 * **The whole component is one fact a stylesheet cannot work out for itself:
 * which edges have content past them.** A fade at the bottom of a list is easy
 * to draw and impossible to decide, because CSS has no reading of scroll
 * position. So this measures and says, in a custom state per edge, and the
 * styled tier draws whatever it likes on the edges named.
 *
 * **States rather than attributes**, so an element that upgrades after a
 * framework rendered its markup does not hand that framework markup it did not
 * write. A stylesheet asks `:host(:state(more-block-end))`.
 *
 * **A scrolling region takes the keyboard when it scrolls, and not before.**
 * A box a reader can only reach with a pointer is a box some readers cannot
 * read at all, which is what `tabindex` answers here. Only while it overflows:
 * a tab stop on a box with nothing to scroll is a stop that does nothing, and a
 * form full of them is worse than the problem.
 *
 * `role="region"` only with a `label`, because an unnamed region is an
 * announcement with no content: a screen reader says "region" and the reader
 * has learned nothing they did not already know.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Scroller, Overflow, Scroll container
 * @documentation https://fusion.dev/helix/components/scroll-area
 *
 * @slot - What scrolls.
 *
 * @csspart edges - Where the sideways edge cues are drawn.
 * @csspart viewport - The scrolling box.
 *
 * @cssstate more-block-end - While there is more to scroll to past the block end.
 * @cssstate more-block-start - While there is more to scroll back to before the block start.
 * @cssstate more-inline-end - While there is more to scroll to past the inline end.
 * @cssstate more-inline-start - While there is more to scroll back to before the inline start.
 * @cssstate scrolls - While the content is larger than the viewport, on either axis.
 */
@customElement('helix-headless-scroll-area')
export class HelixHeadlessScrollArea extends HelixElement {
  /**
   * Names the region, for a reader arriving at it out of context.
   *
   * Without one there is no region: see the note on the class.
   */
  @property()
  label = ''

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
   * The box that actually scrolls, for anything that needs to move it.
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
      @scroll=${this.measure}
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
    ></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-scroll-area': HelixHeadlessScrollArea
  }
}

export { EDGES }
