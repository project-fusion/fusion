import {
  anchorElement,
  customElement,
  HelixElement,
  hostAria,
  MixinControllerOpen,
  type Placement,
  PopoverController,
} from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/** Tags that exist to hold something, and say nothing when they hold nothing. */
const GENERIC = new Set(['div', 'p', 'section', 'span'])

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

  /**
   * Space between the trigger and the bubble, in pixels.
   *
   * Eight, which is not arbitrary: it is the size of the arrow the styled tier
   * draws, so the point reaches the trigger and the bubble does not. A consumer
   * changing this and keeping the arrow gets a point that falls short or one
   * that overlaps what it is pointing at, which is worth knowing before
   * changing it rather than after.
   */
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
   * What is currently keeping the bubble up.
   *
   * The pointer and focus are two holders and they shared one timer with
   * nothing counting them, so whichever left last won: moving the pointer off a
   * control that still had keyboard focus scheduled a hide and took the bubble
   * away from under the reader. The same fault the toast timer had, and the
   * same answer.
   */
  private readonly holds = new Set<'focus' | 'pointer'>()

  /**
   * The element the bubble points at.
   *
   * The trigger, not the host. The host is `display: contents` so it wraps
   * without adding a box, and an element that generates no box measures as
   * nothing at the document origin: the bubble was placed against the corner
   * of the viewport rather than against the button.
   */
  private get trigger(): HTMLElement {
    /* Through the util, which was written from a measurement of this component
       and then not used by it. Its extra is the descent: the first assigned
       element may itself draw nothing, and an icon button wrapped in a
       `display: contents` span was the case that took the bubble to the corner
       of the window. */
    return anchorElement(this.renderRoot.querySelector<HTMLSlotElement>('slot:not([name])'), this)
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
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return node.textContent?.trim() !== ''
      }
      /* A wrapper is empty when it holds nothing; anything else draws.
       *
       * The test was children-or-text for every element, which reads as careful
       * and refused the exact case this getter's own paragraph calls the whole
       * point of slotting. `<helix-icon slot="content">` has no children and no
       * text, so `hasContent` was false, `show()` returned early, and a tooltip
       * whose bubble is an icon could not be opened at all. Measured in a
       * browser: `open` stayed false through a direct `show()`.
       *
       * The spec beside this one is the other half, and it is why the answer is
       * not simply "an element is content": `<span slot="content">   </span>`
       * is an element too and says nothing. In the light DOM those two are
       * identical, so nothing can separate them by shape and the tag is what
       * is left. A generic wrapper is asked to hold something; everything else,
       * an icon, an image, an svg, a component, draws on its own. */
      const element = node as Element
      return GENERIC.has(element.localName)
        ? element.childElementCount > 0 || element.textContent?.trim() !== ''
        : true
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
    this.holds.add('pointer')
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.show(), this.delay)
  }

  /** Hides after `delayOut`, so crossing the gap to the bubble does not close it. */
  private readonly hideLater = (): void => {
    this.holds.delete('pointer')
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.release(), this.delayOut)
  }

  private readonly showNow = (): void => {
    this.holds.add('focus')
    this.show()
  }

  private readonly releaseFocus = (): void => {
    this.holds.delete('focus')
    this.release()
  }

  /** Hides only once nothing is holding the bubble up. */
  private release(): void {
    if (this.holds.size === 0) {
      this.hide()
    }
  }

  /**
   * Escape closes the bubble from wherever the reader is.
   *
   * On the document, not on the host, which is where it was: a tooltip opened
   * by hover has focus somewhere else entirely, so the press never reached this
   * element and Escape worked only for the one case that needed it least. That
   * is the case the pattern names, a reader escaping a tooltip obscuring what
   * is under it, and it was the case that did nothing.
   *
   * Not stopped from propagating: a tooltip is not what the reader was trying
   * to escape if it sits inside something else that also closes.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.open) {
      this.holds.clear()
      this.hide()
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('pointerenter', this.showLater)
    this.addEventListener('pointerleave', this.hideLater)
    // Focus opens at once: a keyboard reader landing on a control has already
    // committed to it, where a pointer crossing one has not.
    this.addEventListener('focusin', this.showNow)
    this.addEventListener('focusout', this.releaseFocus)
    document.addEventListener('keydown', this.handleKeydown)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('pointerenter', this.showLater)
    this.removeEventListener('pointerleave', this.hideLater)
    this.removeEventListener('focusin', this.showNow)
    this.removeEventListener('focusout', this.releaseFocus)
    document.removeEventListener('keydown', this.handleKeydown)
    this.holds.clear()
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
    /* The reference goes on the host, and the host is not what a reader is on.
     *
     * The host is `display: contents` and carries no role; the thing that takes
     * focus is the consumer's trigger inside it, and a description on an
     * ancestor is not announced with it. So the trigger has to be described
     * too, and it cannot be described by reference: measured, assigning
     * `trigger.ariaDescribedByElements = [bubble]` reads back as an empty array,
     * a reference being valid only into the same tree or a shadow-including
     * ancestor of it. The bubble's tree is neither, it is inward.
     *
     * A string crosses anything, and `aria-description` is what a string
     * description is called. Same shape as the tabs panel: where the reference
     * cannot reach, the name goes instead of the pointer to it.
     *
     * The host keeps its reference as well, which costs nothing and is what
     * describes the tooltip where the trigger *is* the host, the case
     * `anchorElement` falls back to. */
    hostAria(this.internals, { describedBy: this.hasContent ? [bubble] : [] })
    const trigger = this.trigger
    if (trigger !== this && 'ariaDescription' in trigger) {
      trigger.ariaDescription = this.hasContent ? bubble.textContent?.trim() || null : null
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
