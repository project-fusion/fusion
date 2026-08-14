import { customElement, FloatingController, HelixElement, type Placement } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

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
 * @since 0.1.0
 * @status experimental
 * @aliases Hint, Popup label
 * @documentation https://helix.fusion.dev/components/tooltip
 *
 * @slot - The trigger.
 *
 * @csspart tooltip - The bubble.
 * @csspart arrow - The point aimed at the trigger.
 */
@customElement('helix-base-tooltip')
export class HelixBaseTooltip extends HelixElement {
  /** The text shown in the bubble. */
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

  /** Whether the bubble is showing. */
  @state()
  private showing = false

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

  private readonly floating = new FloatingController(this, {
    anchor: () => this.trigger,
    arrow: () => this.renderRoot.querySelector<HTMLElement>('[part="arrow"]'),
    floating: () => this.renderRoot.querySelector<HTMLElement>('[part="tooltip"]'),
    offset: () => this.offset,
    placement: () => this.placement,
  })

  private get bubble(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('[part="tooltip"]')
  }

  /** Shows the bubble, unless there is nothing to show. */
  show(): void {
    if (this.disabled || this.content === '' || this.showing) {
      return
    }
    this.showing = true
    this.updateComplete.then(() => {
      this.bubble?.showPopover?.()
      this.floating.start()
    })
  }

  /** Hides the bubble. */
  hide(): void {
    if (!this.showing) {
      return
    }
    this.showing = false
    this.bubble?.hidePopover?.()
    this.floating.stop()
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.showing) {
      // Not stopped from propagating: a tooltip is not what the reader was
      // trying to escape if it sits inside something else that also closes.
      this.hide()
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('pointerenter', this.show)
    this.addEventListener('pointerleave', this.hide)
    this.addEventListener('focusin', this.show)
    this.addEventListener('focusout', this.hide)
    this.addEventListener('keydown', this.handleKeydown)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('pointerenter', this.show)
    this.removeEventListener('pointerleave', this.hide)
    this.removeEventListener('focusin', this.show)
    this.removeEventListener('focusout', this.hide)
    this.removeEventListener('keydown', this.handleKeydown)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const bubble = this.bubble
    if (!bubble) {
      return
    }
    // By element rather than by id, which cannot cross the shadow boundary.
    const internals = this.internals as ElementInternals & {
      ariaDescribedByElements?: Element[] | null
    }
    if ('ariaDescribedByElements' in internals) {
      internals.ariaDescribedByElements = this.content === '' ? null : [bubble]
    }
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>
      <div part="tooltip" popover="manual" role="tooltip">
        ${this.content}
        <div part="arrow"></div>
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-tooltip': HelixBaseTooltip
  }
}
