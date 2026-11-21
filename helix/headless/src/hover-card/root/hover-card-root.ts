import {
  customElement,
  deepContains,
  elementById,
  HelixElement,
  MixinControllerOpen,
  numberConverter,
  OpenPhaseController,
  type Placement,
  PopoverController,
  type Side,
  sideOf,
  timeConverter,
} from '@fusion.dev/helix-core'
import { type CSSResultGroup, css, html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/**
 * @summary A card that opens beside a link while the pointer rests on it or focus is on it, such as a preview of a person or a page.
 *
 * @description
 * Name the link it opens from with `for`, and put the card's content inside:
 *
 * ```html
 * <a href="/people/ada" id="ada">Ada Lovelace</a>
 * <helix-headless-hover-card for="ada">
 *   <p>Ada Lovelace, analyst. <a href="/people/ada/notes">Read her notes</a></p>
 * </helix-headless-hover-card>
 * ```
 *
 * The card opens once the pointer has rested on the link for `delay`, and at
 * once on keyboard focus. It stays open while the pointer is over the link or
 * the card, or focus is in either, and closes `delay-out` after both are left.
 * It closes on Escape and on a press elsewhere.
 *
 * **It adds to the link and never stands in for it.** The link still goes
 * where it goes when pressed.
 *
 * **Opening moves no focus.** A reader who tabbed to the link stays on it.
 * The card is no
 * description of the link and names nothing on it, so a screen reader reads
 * the link as it is and the card as content when it is reached.
 *
 * The card is in the top layer through the popover API, so an ancestor with
 * `overflow: hidden` does not clip it and no `z-index` is needed, and it moves
 * to another side where the one asked for does not fit.
 *
 * @since 0.241.0
 * @status experimental
 * @category overlays
 * @aliases Preview card, Link preview, Profile card, Hover preview
 * @use A preview of a person or a page that opens from a link while the pointer rests on it.
 * @instead tooltip - A short text that names a control.
 * @instead popover - Content that opens on a press, such as a short form.
 * @practice Put nothing in the card that you can reach only there. - A touch screen has no hover, so it follows the link without opening the card.
 * @practice Place the card right after the link that `for` names. - The next Tab from the link goes into the card, whose content follows the link in the page's order.
 * @documentation https://fusion.dev/design/components/hover-card
 *
 * @slot - The card's content, which may hold links and buttons.
 *
 * @event {HelixBeforeCloseEvent} helix-before-close - The card is about to close. Cancelable: cancel it to keep it open.
 * @event {HelixBeforeOpenEvent} helix-before-open - The card is about to open. Cancelable: cancel it to keep it closed.
 * @event {ToggleEvent} toggle - The card opened or closed. The event carries `newState` and `oldState`.
 *
 * @csspart surface - The card.
 * @csspart surface-bottom - Added to `surface` while the card is below the link.
 * @csspart surface-left - Added to `surface` while the card is left of the link.
 * @csspart surface-right - Added to `surface` while the card is right of the link.
 * @csspart surface-top - Added to `surface` while the card is above the link.
 *
 * @cssstate entering - From the moment the card opens until its entrance has finished.
 * @cssstate exiting - From the moment the card closes until its exit has finished.
 * @cssstate open - While the card is open.
 * @cssstate placed-bottom - While the card sits below the link.
 * @cssstate placed-left - While the card sits to the left of the link.
 * @cssstate placed-right - While the card sits to the right of the link.
 * @cssstate placed-top - While the card sits above the link.
 */
@customElement('helix-headless-hover-card')
export class HelixHeadlessHoverCard extends MixinControllerOpen(HelixElement) {
  /* No box of its own: the card is in the top layer and the element only
     holds its content. */
  static override styles: CSSResultGroup = css`
    :host {
      display: contents;
    }
  `

  /** How long the pointer rests on the link before the card opens, in milliseconds. */
  @property({ attribute: 'delay', converter: timeConverter('delay', 600) })
  delay = 600

  /** How long the card stays once the pointer and focus have left the link and the card, in milliseconds. */
  @property({ attribute: 'delay-out', converter: timeConverter('delay-out', 300) })
  delayOut = 300

  /**
   * The `id` of the link the card opens from, looked up in the card's own
   * root.
   */
  @property()
  for = ''

  /** The gap between the link and the card, in pixels. */
  @property({ converter: numberConverter('offset', 8, 'pixels') })
  offset = 8

  /** The side to open the card on. It moves if that side does not fit. */
  @property()
  placement: Placement = 'bottom'

  /** The side the card landed on, for the parts a sheet draws by side. */
  @state()
  private side: Side | undefined

  /** What is keeping the card open: a pointer over the link or the card, or focus in either. */
  private readonly holds = new Set<'focus' | 'pointer'>()

  /** The open or close waiting on a delay. */
  private timer: ReturnType<typeof setTimeout> | undefined

  /** The link the listeners are on, held so they come off the same element. */
  private bound: HTMLElement | undefined

  /** The element `for` names, or nothing. */
  private get trigger(): HTMLElement | null {
    return this.for === '' ? null : elementById(this, this.for)
  }

  private readonly layer = new PopoverController(this, {
    anchor: () => this.trigger,
    boundary: (): readonly (Element | null)[] => [this, this.trigger],
    hints: 'keep',
    offset: () => this.offset,
    onDismiss: () => {
      this.holds.clear()
      this.hide()
    },
    onPlace: (placement) => {
      const side = sideOf(placement)
      this.toggleState('placed-bottom', side === 'bottom')
      this.toggleState('placed-left', side === 'left')
      this.toggleState('placed-right', side === 'right')
      this.toggleState('placed-top', side === 'top')
      this.side = side
    },
    placement: () => this.placement,
    surface: () => this.partNamed('surface'),
  })

  protected readonly phases = new OpenPhaseController(this, {
    mark: {
      entering: (on) => this.toggleState('entering', on),
      exiting: (on) => this.toggleState('exiting', on),
    },
    open: () => this.open,
    surface: () => this.partNamed('surface'),
  })

  /** Opens the card, and cancels a waiting close. */
  show(): void {
    clearTimeout(this.timer)
    if (!this.open) {
      this.requestOpen(true)
    }
  }

  /** Closes the card, and cancels a waiting open. */
  hide(): void {
    clearTimeout(this.timer)
    if (this.open && this.requestOpen(false)) {
      this.layer.hide()
    }
  }

  /** A pointer on the link or the card: hold it open, and open it after `delay` where it is closed. */
  private readonly enter = (): void => {
    this.holds.add('pointer')
    clearTimeout(this.timer)
    if (!this.open) {
      this.timer = setTimeout(() => this.show(), this.delay)
    }
  }

  /** A pointer leaving the link or the card. */
  private readonly leave = (): void => {
    this.holds.delete('pointer')
    this.release()
  }

  /**
   * Focus on the link or in the card. **Keyboard focus on the link opens it at
   * once**, as a reader who tabbed there has chosen it, and a mouse press,
   * which focuses without `:focus-visible`, does not.
   */
  private readonly focusIn = (event: Event): void => {
    const focused = event.composedPath()[0]
    const inCard = focused instanceof Node && deepContains(this, focused)
    if (!inCard && focused instanceof Element && !focused.matches(':focus-visible')) {
      return
    }
    this.holds.add('focus')
    this.show()
  }

  /** Focus leaving, to somewhere outside both the link and the card. */
  private readonly focusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget
    const trigger = this.trigger
    if (
      next instanceof Node &&
      (deepContains(this, next) || (trigger && deepContains(trigger, next)))
    ) {
      return
    }
    this.holds.delete('focus')
    this.release()
  }

  /** Closes after `delay-out` once nothing holds the card open, so crossing the gap does not close it. */
  private release(): void {
    clearTimeout(this.timer)
    if (this.holds.size === 0) {
      this.timer = setTimeout(() => this.hide(), this.delayOut)
    }
  }

  /** Puts the listeners on the link `for` names. Client only, after the first render. */
  private bind(): void {
    const trigger = this.trigger
    if (this.bound === trigger) {
      return
    }
    this.unbind()
    if (!trigger) {
      return
    }
    trigger.addEventListener('pointerenter', this.enter)
    trigger.addEventListener('pointerleave', this.leave)
    trigger.addEventListener('focusin', this.focusIn)
    trigger.addEventListener('focusout', this.focusOut)
    this.bound = trigger
  }

  private unbind(): void {
    this.bound?.removeEventListener('pointerenter', this.enter)
    this.bound?.removeEventListener('pointerleave', this.leave)
    this.bound?.removeEventListener('focusin', this.focusIn)
    this.bound?.removeEventListener('focusout', this.focusOut)
    this.bound = undefined
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('focusin', this.focusIn)
    this.addEventListener('focusout', this.focusOut)
    if (this.hasUpdated) {
      this.bind()
    }
  }

  override disconnectedCallback(): void {
    clearTimeout(this.timer)
    this.removeEventListener('focusin', this.focusIn)
    this.removeEventListener('focusout', this.focusOut)
    this.unbind()
    super.disconnectedCallback()
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.bind()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('for')) {
      this.bind()
    }
    /* Raised from the resolved state, once the render has made the card a
       box, so one opened by declaring `open` takes the same path. */
    if (changed.has('open')) {
      if (this.open) {
        this.layer.show()
      } else if (changed.get('open') !== undefined) {
        this.layer.hide()
      }
    }
  }

  protected override render(): TemplateResult {
    const side = this.side
    return html`<div
      part="surface${side ? { bottom: ' surface-bottom', left: ' surface-left', right: ' surface-right', top: ' surface-top' }[side] : ''}"
      popover="manual"
      @pointerenter=${this.enter}
      @pointerleave=${this.leave}
    ><slot></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-hover-card': HelixHeadlessHoverCard
  }
}
