import {
  customElement,
  HelixElement,
  MixinControllerOpen,
  type Placement,
  PopoverController,
} from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A short description that appears beside what it describes.
 *
 * @description
 * The trigger is slotted and stays the consumer's own element. The bubble is
 * rendered here, in the top layer through the popover API, so it clears any
 * ancestor with `overflow: hidden` without a `z-index` anywhere.
 *
 * Position comes from `FloatingController`, which flips to another side when
 * the preferred one does not fit and slides along it to stay in view.
 *
 * **The description is linked by element reference, not by id.** An IDREF
 * cannot cross a shadow boundary, so `aria-describedby` on a slotted trigger
 * pointing at a bubble in here resolves to nothing.
 * `ElementInternals.ariaDescribedByElements` takes the element itself, which
 * does cross.
 *
 * It shows on hover and on focus, and hides on leave, on blur, and on Escape.
 * A tooltip that answers only the pointer is one a keyboard reader never sees.
 *
 * The pointer waits out `delay` first, or sweeping a row of controls flashes a
 * tooltip for each of them. Focus does not wait: a keyboard reader landing on a
 * control has already committed to it.
 *
 * Open state comes from `MixinControllerOpen`, so it announces `helix-open` and
 * `helix-close` like every other overlay here, and a consumer can drive it with
 * `open` where they need to.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Hint, Popup label
 * @documentation https://helix.fusion.dev/components/tooltip
 *
 * @slot - The trigger.
 * @slot content - The bubble's content, when `content` is not enough. Anything
 * slotted here replaces the property, which is this slot's fallback.
 *
 * @event {HelixOpenEvent} helix-open - Fired before the bubble shows, and cancelable.
 * @event {HelixCloseEvent} helix-close - Fired before it hides, and cancelable.
 *
 * @csspart tooltip - The bubble.
 * @csspart arrow - The point aimed at the trigger.
 */
@customElement('helix-base-tooltip')
export class HelixBaseTooltip extends MixinControllerOpen(HelixElement) {
  /**
   * The text shown in the bubble.
   *
   * The common case, and the fallback for the `content` slot: slot something
   * there and it replaces this. Both cannot show at once, which is the point
   * of using fallback content rather than rendering whichever is present.
   */
  @property()
  content = ''

  /** Preferred side. It moves if that side does not fit. */
  @property()
  placement: Placement = 'top'

  /** Space between the trigger and the bubble, in pixels. */
  @property({ type: Number })
  offset = 8

  /** Whether the tooltip never shows. */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * How long the pointer must rest before the bubble appears, in milliseconds.
   *
   * Without one, sweeping across a row of controls flashes a tooltip for each
   * of them, which is noise rather than help. Focus opens with no delay: a
   * keyboard reader arriving on a control has already committed to it.
   */
  @property({ attribute: 'delay', type: Number })
  delay = 400

  /** How long the bubble stays after the pointer leaves, in milliseconds. */
  @property({ attribute: 'delay-out', type: Number })
  delayOut = 100

  private timer: ReturnType<typeof setTimeout> | undefined

  /**
   * The element the bubble points at.
   *
   * The trigger, not the host. The host is `display: contents` so it wraps
   * without adding a box, and an element that generates no box measures as
   * nothing at the document origin: the bubble was placed against the corner
   * of the viewport rather than against the button.
   */
  private get trigger(): HTMLElement {
    const slot = this.renderRoot.querySelector('slot:not([name])') as HTMLSlotElement | null
    const assigned = slot?.assignedElements({ flatten: true }) ?? []
    return (assigned[0] as HTMLElement | undefined) ?? this
  }

  /* One controller rather than the pair this was: a `FloatingController` beside
     hand-written `showPopover`/`hidePopover` calls, which is exactly the
     composition `PopoverController` exists to own. Its own documentation named
     the controller it was not using.
   *
   * The boundary is the host and not the bubble, for the reason `Popover` gives:
   * the host is `display: contents`, so a press on the trigger is inside the
   * host and outside the bubble, and a boundary of the bubble alone would treat
   * the press that opened it as a press outside. */
  private readonly bubbleLayer = new PopoverController(this, {
    anchor: () => this.trigger,
    arrow: () => this.renderRoot.querySelector<HTMLElement>('[part="arrow"]'),
    boundary: () => this,
    offset: () => this.offset,
    onDismiss: () => this.hide(),
    placement: () => this.placement,
    surface: () => this.renderRoot.querySelector<HTMLElement>('[part="tooltip"]'),
  })

  private get bubble(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('[part="tooltip"]')
  }

  /**
   * Whether there is anything to show.
   *
   * Asked of the slot rather than of the property, because either can carry
   * the content. `assignedNodes` without `flatten` answers what the consumer
   * provided and not what the fallback would render, which is exactly the
   * question: a bubble with only fallback and an empty property is empty.
   *
   * Text or an element, because neither alone is the test. An element on its
   * own would count `<span slot="content">   </span>` as something to say,
   * and text on its own would count an icon as nothing, when an icon is the
   * whole point of slotting rather than setting the property.
   *
   * Client only. The server has no assignment to inspect, and nothing calls
   * this there: a tooltip opens in response to a pointer or to focus.
   */
  private get hasContent(): boolean {
    if (this.content !== '') {
      return true
    }
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot[name="content"]')
    return (slot?.assignedNodes() ?? []).some((node) => {
      const holdsElement =
        node.nodeType === Node.ELEMENT_NODE && (node as Element).childElementCount > 0
      return holdsElement || node.textContent?.trim() !== ''
    })
  }

  /**
   * Re-links the description when what is in the bubble changes.
   *
   * `updated` alone is not enough: content arriving from the light DOM changes
   * no property here, so nothing would schedule the update that re-reads it. A
   * consumer rendering the bubble's content after this upgrades, which is what
   * a framework does, would leave the trigger describing nothing.
   */
  private readonly handleContentChange = (): void => {
    this.requestUpdate()
  }

  /** Shows the bubble, unless there is nothing to show. */
  show(): void {
    clearTimeout(this.timer)
    if (this.disabled || !this.hasContent || this.open) {
      return
    }
    if (!this.requestOpen(true)) {
      return
    }
    // Raised in `updated()`, which the state change has just scheduled: one
    // path whether the bubble was opened by a pointer or by declaring `open`.
  }

  /** Hides the bubble. */
  hide(): void {
    clearTimeout(this.timer)
    if (!this.open) {
      return
    }
    if (!this.requestOpen(false)) {
      return
    }
    this.bubbleLayer.hide()
  }

  /** Shows after the pointer has rested for `delay`. */
  private readonly showLater = (): void => {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.show(), this.delay)
  }

  /** Hides after `delayOut`, so crossing the gap to the bubble does not close it. */
  private readonly hideLater = (): void => {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.hide(), this.delayOut)
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.open) {
      // Not stopped from propagating: a tooltip is not what the reader was
      // trying to escape if it sits inside something else that also closes.
      this.hide()
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('pointerenter', this.showLater)
    this.addEventListener('pointerleave', this.hideLater)
    // Focus opens at once: a keyboard reader landing on a control has already
    // committed to it, where a pointer crossing one has not.
    this.addEventListener('focusin', this.show)
    this.addEventListener('focusout', this.hide)
    this.addEventListener('keydown', this.handleKeydown)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('pointerenter', this.showLater)
    this.removeEventListener('pointerleave', this.hideLater)
    this.removeEventListener('focusin', this.show)
    this.removeEventListener('focusout', this.hide)
    this.removeEventListener('keydown', this.handleKeydown)
    clearTimeout(this.timer)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* Raised and lowered from the resolved state, so a bubble opened by
       declaring `open` takes the same path as one opened by a pointer. Here
       rather than a microtask later: the render has been written, so the bubble
       is no longer `display: none` and `showPopover` is safe on it. */
    if (changed.has('open')) {
      if (this.open) {
        this.bubbleLayer.show()
      } else {
        this.bubbleLayer.hide()
      }
    }
    const bubble = this.bubble
    if (!bubble) {
      return
    }
    // By element rather than by id, which cannot cross the shadow boundary.
    const internals = this.internals as ElementInternals & {
      ariaDescribedByElements?: Element[] | null
    }
    if ('ariaDescribedByElements' in internals) {
      internals.ariaDescribedByElements = this.hasContent ? [bubble] : null
    }
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>
      <div part="tooltip" popover="manual" role="tooltip">
        <slot name="content" @slotchange=${this.handleContentChange}
          >${this.content}</slot
        >
        <div part="arrow"></div>
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-tooltip': HelixBaseTooltip
  }
}
