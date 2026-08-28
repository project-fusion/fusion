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
 * position. So this measures and says, in `data-more`, and the styled tier
 * draws whatever it likes on the edges named.
 *
 * **Tokens rather than four attributes**, so a stylesheet asks
 * `[data-more~="block-end"]` the way it would ask about a class. Four booleans
 * say the same thing in four selectors and read worse at every use.
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
 * @documentation https://helix.fusion.dev/components/scroll-area
 *
 * @slot - What scrolls.
 *
 * @csspart edges - Where the sideways edge cues are drawn.
 * @csspart viewport - The scrolling box.
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
   * **Public because the alternative is silence.** Bringing a row into view
   * means telling a scroll utility which box to scroll, and the scrolling box
   * here is inside a shadow root: a consumer holding a reference to this
   * element holds the host, which does not scroll, and `scrollBy` on it is a
   * no-op that reports nothing. That is exactly how `scrollItemIntoView`'s
   * `offsetParent` default fails, and the sandbox sidebar spent an afternoon
   * scrolled to zero because of it.
   *
   * The element rather than a method of our own, because the utilities that
   * want it already take one, and `Tree`, `Combobox` and anything windowing a
   * long list all want the same thing from it.
   */
  get scroller(): HTMLElement | null {
    return this.renderRoot?.querySelector('[part="viewport"]') ?? null
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
    if (box.scrollLeft > slack) {
      found.push('inline-start')
    }
    if (box.scrollLeft + box.clientWidth < box.scrollWidth - slack) {
      found.push('inline-end')
    }
    this.more = found
    this.scrolls = box.scrollHeight > box.clientHeight || box.scrollWidth > box.clientWidth
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* Both the box and what is in it. The box changing size is a layout change
       and the content changing size is a data change, and a fade that only
       answered one of them was wrong every time a list was filtered. */
    this.watcher = new ResizeObserver(this.measure)
    /* And what it watches, which was registered only in `firstUpdated`.
     *
     * The observer was already rebuilt here, so this looked like the one
     * component that had the lifecycle right, and it was half right. A fresh
     * observer watches nothing until something calls `observe`, and only
     * `firstUpdated` did, which runs once for the life of the element. So a
     * scroll area moved in the DOM came back with a new observer registered on
     * no targets: the fades stopped answering a resize or a filtered list, and
     * the component went on rendering.
     *
     * Guarded on `hasUpdated`, because the first connection happens before the
     * first render and there is no scroller to find yet. `check:observers`
     * holds it, and had to be tightened to see it: asking for `new` *or*
     * `observe` passed this on the half that was fine. */
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
       outside without reaching through a part. */
    this.toggleAttribute('data-scrolls', this.scrolls)
    if (this.more.length > 0) {
      this.setAttribute('data-more', this.more.join(' '))
    } else {
      this.removeAttribute('data-more')
    }
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
