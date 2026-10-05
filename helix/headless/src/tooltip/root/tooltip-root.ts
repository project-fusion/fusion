import {
  anchorElement,
  arrowReach,
  customElement,
  elementById,
  HelixElement,
  hostAria,
  linkDescription,
  MixinControllerOpen,
  type Placement,
  PopoverController,
  reportRuntime,
  type Side,
  sideOf,
  unlinkDescription,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { focusTarget } from '../focus-target.js'

/** Tags that exist to hold something, and say nothing when they hold nothing. */
const GENERIC = new Set(['div', 'p', 'section', 'span'])

/**
 * The tooltips showing on the page, and when the last one hid.
 *
 * On `globalThis` under a `Symbol.for` key, so two copies of this module on
 * one page share it, for the reason `DismissController` gives about its own.
 */
interface Warmth {
  hidAt: number
  showing: Set<HelixHeadlessTooltip>
}
const WARMTH = Symbol.for('fusion.helix.tooltip.warmth')
const warmth = (): Warmth => {
  const globals = globalThis as unknown as Record<symbol, Warmth | undefined>
  globals[WARMTH] ??= { hidAt: Number.NEGATIVE_INFINITY, showing: new Set() }
  return globals[WARMTH]
}

/**
 * @summary A short text that appears next to an element on hover and focus.
 *
 * @description
 * The trigger is slotted and stays your own element. The bubble renders in the
 * top layer through the popover API, so an ancestor with `overflow: hidden`
 * does not clip it and no `z-index` is needed. `FloatingController` positions
 * it and flips it to another side when the preferred side does not fit.
 *
 * **The tooltip describes its trigger itself, in both forms.** Wrap the
 * trigger, or place the tooltip beside it and name the trigger with `for`:
 *
 * ```html
 * <helix-headless-button id="save">Save</helix-headless-button>
 * <helix-headless-tooltip for="save" content="Save your work"></helix-headless-tooltip>
 * ```
 *
 * The link is an element reference on the control that takes focus, and it is
 * never written into your markup before a reader has acted. A trigger that is a
 * Helix component is described at once, inside its own shadow root. A plain
 * element in your markup is described when a reader first points at it or
 * focuses it, which is after any hydration, and only where you have written no
 * `aria-describedby` or `aria-labelledby` of your own. Write
 * `aria-describedby` pointing at the tooltip yourself to have the link in the
 * server's markup. Where the browser has no element references, write it
 * yourself; the tooltip warns once on first open if nothing links the two.
 *
 * The tooltip shows on hover and on focus. It hides on pointer leave, on blur,
 * on Escape, and when the trigger is activated. The pointer can move from the
 * trigger onto the bubble and the bubble stays.
 *
 * Once one tooltip is showing, moving to another trigger shows its tooltip
 * with no `delay`, and the first one hides. The same holds for `skip-delay`
 * milliseconds after a tooltip hides, 300 unless you set it. `show-on="focus"`
 * shows the tooltip on keyboard focus only, for a hint a pointer does not need.
 *
 * @since 0.1.0
 * @status stable
 * @category overlays
 * @aliases Hint, Popup label
 * @documentation https://fusion.dev/helix/components/tooltip
 *
 * @slot - The trigger, in the wrapping form. The tooltip describes it, as it
 * describes the element `for` names.
 * @slot content - Rich content for the bubble. It replaces the `content`
 * property.
 *
 * @event {HelixBeforeCloseEvent} helix-before-close - The bubble is about to hide. Cancelable: cancel it to keep it shown.
 * @event {HelixBeforeOpenEvent} helix-before-open - The bubble is about to show. Cancelable: cancel it to keep it hidden.
 * @event {ToggleEvent} toggle - The bubble opened or closed. The event carries `newState` and `oldState`.
 *
 * @csspart arrow - The arrow that points at the trigger.
 * @csspart arrow-bottom - Added to `arrow` while the bubble is below its trigger, with the arrow on the bubble's top edge.
 * @csspart arrow-left - Added to `arrow` while the bubble is left of its trigger, with the arrow on the bubble's right edge.
 * @csspart arrow-right - Added to `arrow` while the bubble is right of its trigger, with the arrow on the bubble's left edge.
 * @csspart arrow-top - Added to `arrow` while the bubble is above its trigger, with the arrow on the bubble's bottom edge.
 * @csspart tooltip - The bubble.
 * @csspart tooltip-bottom - Added to `tooltip` while the bubble is below its trigger.
 * @csspart tooltip-left - Added to `tooltip` while the bubble is left of its trigger.
 * @csspart tooltip-right - Added to `tooltip` while the bubble is right of its trigger.
 * @csspart tooltip-top - Added to `tooltip` while the bubble is above its trigger.
 *
 * @cssstate open - While the tooltip shows.
 * @cssstate placed-bottom - While the bubble sits below its trigger.
 * @cssstate placed-left - While the bubble sits to the left of its trigger.
 * @cssstate placed-right - While the bubble sits to the right of its trigger.
 * @cssstate placed-top - While the bubble sits above its trigger.
 */
@customElement('helix-headless-tooltip')
export class HelixHeadlessTooltip extends MixinControllerOpen(HelixElement) {
  /**
   * The text shown in the bubble.
   *
   * The common case, and the fallback for the `content` slot: slot something
   * there and it replaces this. Both cannot show at once, which is the point
   * of using fallback content rather than rendering whichever is present.
   */
  @property()
  content = ''

  /**
   * How long the pointer must rest before the bubble appears, in milliseconds.
   *
   * Without one, sweeping across a row of controls flashes a tooltip for each
   * of them, which is noise rather than help. Focus opens with no delay: a
   * keyboard reader arriving on a control has already committed to it.
   */
  @property({ attribute: 'delay', type: Number })
  delay = 400

  /**
   * How long the bubble stays after the pointer leaves, in milliseconds.
   */
  @property({ attribute: 'delay-out', type: Number })
  delayOut = 100

  /**
   * Stops the tooltip from showing.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * The id of the element the tooltip describes, in the same document or shadow
   * root as the tooltip.
   *
   * Set it and the tooltip stops wrapping: it renders no trigger, listens on
   * the element it names, and points its bubble there. Leave it unset and the
   * default slot is the trigger, which is the older form.
   *
   * Names an element in the same tree, so a tooltip inside another component's
   * shadow root points at one in that root rather than one in the document.
   *
   * **In React this arrives as a property and not as an attribute**, which is
   * worth knowing before someone reads the DOM and thinks it did not take.
   * Measured against React 19.2.8: `for` exists on the prototype, so React sets
   * `element.for = 'save'` and writes nothing to the markup, where `content`
   * and `placement`, which are not properties on the class at that moment, come
   * through as attributes. Both paths reach the same place through Lit, so
   * nothing is broken by it; a `[for]` selector would find nothing, which is
   * why this does not reflect and nothing styles on it.
   */
  @property()
  for = ''

  /**
   * The space between the trigger and the tip of the bubble, in pixels.
   *
   * **Measured from the point, which is what the arrow being back changed.**
   * The arrow is drawn half outside the bubble, so a gap measured to the
   * bubble's edge is a smaller gap to the tip: at the default it left the point
   * two pixels off the trigger, which reads as touching. The controller is
   * given this plus however far the arrow actually protrudes, so eight means
   * eight from whatever is nearest, arrow or edge, and a consumer who changes
   * it changes the visible gap rather than a number the arrow then eats into.
   */
  @property({ type: Number })
  offset = 8

  /**
   * Keeps the bubble open when the trigger is used, such as a copy button whose
   * tooltip changes to "Copied".
   *
   * **Activation takes a tooltip down, because a hint about what a control will
   * do is spent once the control has done it.** That is right for a gear that
   * opens a drawer and wrong for a control whose tooltip *becomes* the answer:
   * `CopyButton` swaps its content from Copy to Copied on the same click, so
   * the bubble would be hidden at the exact moment it has something to say and
   * the confirmation would never be on screen long enough to read.
   *
   * So this is not "keep it open", it is "the hint is not spent": set it where
   * the words change to describe what just happened, and leave it alone
   * everywhere else. Escape, blur and pointer-leave still close it, because
   * those are a reader saying they are done rather than a control saying it
   * worked.
   */
  @property({ reflect: true, type: Boolean })
  persist = false

  /**
   * The side to show the bubble on.
   *
   * It moves if that side does not fit.
   */
  @property()
  placement: Placement = 'top'

  /**
   * What shows the bubble. Unset, it is a pointer resting on the trigger and
   * keyboard focus. `focus` is keyboard focus alone, for a hint a pointer does
   * not need, such as a shortcut a mouse reader has no use for.
   */
  @property({ attribute: 'show-on' })
  showOn?: 'focus'

  /**
   * How long after a tooltip hides the next one still shows at once, with no
   * `delay`, in milliseconds. The same skip delay Radix uses. Zero makes every
   * tooltip wait.
   */
  @property({ attribute: 'skip-delay', type: Number })
  skipDelay = 300

  /**
   * The id of a box to keep the bubble inside. Defaults to the viewport.
   *
   * Resolved the way `for` is, so an id in the same tree, which is what lets a
   * component name a box in its own shadow root. A chart does: its bubble is
   * centered on a reading, and the first and last readings sit at the ends of
   * the plot, so half the box hangs past the drawing and, measured on a chart
   * in a 320px card, three pixels past the card itself.
   *
   * Clamping is on the cross axis only, which is what makes this safe to point
   * at a box the bubble genuinely does not fit inside. See `within` on
   * `FloatingController` for what happens if it is applied to the rest.
   */
  @property()
  within = ''

  /**
   * The side of its trigger the bubble last landed on, which is not always
   * `placement`: a bubble with no room there is moved.
   *
   * Undefined until the first placement, which the server never makes, so a
   * part name it adds is never markup the server did not send.
   */
  @state()
  private side?: Side

  private timer: ReturnType<typeof setTimeout> | undefined

  /**
   * What is currently keeping the bubble up.
   *
   * The pointer and focus are two holders, so a single timer with nothing
   * counting them hides on whichever leaves last: moving the pointer off a
   * control that still has keyboard focus would take the bubble away from under
   * the reader. Same shape as the toast timer, and the same answer.
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
    /* Named, or slotted. The named one is looked up every time rather than
       cached: `for` can be pointed somewhere else, and the element it names can
       upgrade, move or be replaced by a framework without telling this. */
    const named = this.named
    if (named) {
      return named
    }
    /* Through the util, whose extra is the descent: the first assigned element
       may itself draw nothing, and an icon button wrapped in a
       `display: contents` span takes the bubble to the corner of the window. */
    return anchorElement(this.renderRoot.querySelector<HTMLSlotElement>('slot:not([name])'), this)
  }

  /**
   * Positions the bubble again, for a trigger that moved while the page did not.
   *
   * Public because a chart needs it. Its mark walks from reading to reading
   * while the page holds still, and `autoUpdate` watches scrolling, resizing
   * and layout shift, none of which is that. Everything else floating here is
   * anchored to something the page moves, which is why nothing wanted this
   * until a chart did.
   */
  reposition(): void {
    this.bubbleLayer.reposition()
  }

  /** The element `for` names, or null. */
  private get named(): HTMLElement | null {
    return this.for === '' ? null : elementById(this, this.for)
  }

  /* The boundary is the host and not the bubble, for the reason `Popover` gives:
     the host is `display: contents`, so a press on the trigger is inside the
     host and outside the bubble, and a boundary of the bubble alone would treat
     the press that opened it as a press outside. */
  private readonly bubbleLayer = new PopoverController(this, {
    anchor: () => this.trigger,
    arrow: () => this.partNamed('arrow'),
    /* Annotated, because without it the array's element type is inferred from
       `this`, whose own type depends on this controller, and TypeScript stops
       at the cycle. */
    boundary: (): readonly (Element | null)[] => [this, this.named],
    /* The declared gap plus the arrow's own reach, so the gap is to the point.
     *
     * A square of side `n` rotated forty-five degrees about its own center
     * reaches `n / sqrt(2)` from that center, and the arrow is placed with its
     * center on the bubble's edge, so that is exactly how far past the edge the
     * tip goes. Read from the element rather than assumed, because
     * `--tooltip-arrow-size` is a hook and a theme may have moved it.
     *
     * `offsetWidth` and not `getBoundingClientRect`, which reports the rotated
     * box and would count the reach twice. Zero while the bubble is closed and
     * unrendered, which is right: there is nothing to place then either. */
    offset: () => this.offset + arrowReach(this.partNamed('arrow')),
    /* Escape closes the bubble from wherever the reader is, and this is the
       one listener that hears it.

       On the document, through the controller, not on the host: a tooltip
       opened by hover has focus somewhere else entirely, so a press never
       reaches this element and Escape would work for everything except the
       case the pattern is named for, a reader escaping a tooltip obscuring what
       is under it. The controller listens only while the bubble is up, and it
       is the same arbitration every overlay goes through, so a press with a
       deeper surface open closes that one and leaves this alone rather than
       taking both: a second listener of this element's own answered every
       press for the element's whole connected life and skipped the vote.

       Holds are cleared as well as hiding, for the reason `handleActivate`
       gives: left set, the pointer is still recorded as being over the
       trigger, and the bubble comes back on a `release` it should have been
       dropped from. */
    onDismiss: () => {
      this.holds.clear()
      this.hide()
    },
    /* The side it landed on, said where a sheet outside can read it. The
       controller writes `data-placement` on the bubble and puts the arrow on
       the edge facing the trigger itself, so nothing here is needed to point
       it; this is for a sheet that draws by side, an entrance growing out of
       the trigger or an edge on the arrow's two outer sides, and that sheet is
       outside the shadow root, where no attribute can follow `::part()`. A
       part name because a tooltip is usually inside another component, where
       a document cannot reach its host's state. */
    onPlace: (placement) => {
      const side = sideOf(placement)
      this.toggleState('placed-bottom', side === 'bottom')
      this.toggleState('placed-left', side === 'left')
      this.toggleState('placed-right', side === 'right')
      this.toggleState('placed-top', side === 'top')
      this.side = side
    },
    placement: () => this.placement,
    surface: () => this.partNamed('tooltip'),
    within: () => this.enclosure,
  })

  /**
   * The element `within` names, or null.
   *
   * Same resolution as `named`, and separate from it because they answer
   * different questions: one is what the bubble points at and the other is what
   * it must stay inside, and a component often has one and not the other.
   */
  private get enclosure(): Element | null {
    return this.within === '' ? null : elementById(this, this.within)
  }

  private get bubble(): HTMLElement | null {
    return this.partNamed('tooltip')
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
       * Not children-or-text for every element, which reads as careful and
       * refuses the exact case this getter's own paragraph calls the whole
       * point of slotting: `<helix-headless-icon slot="content">` has no
       * children and no text, so `hasContent` would be false, `show()` would
       * return early, and a tooltip whose bubble is an icon could not be opened
       * at all.
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
   * The bubble's words as a plain string, for naming the host.
   *
   * The property when it is set, otherwise whatever was slotted, flattened.
   * Rich content collapses to its text, which is the right answer for a
   * description: `Save ⌘ S` is what a reader needs, not the markup.
   */
  private get describedText(): string {
    if (this.content !== '') {
      return this.content
    }
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot[name="content"]')
    return (slot?.assignedNodes() ?? [])
      .map((node) => node.textContent ?? '')
      .join(' ')
      .replace(/\s+/gu, ' ')
      .trim()
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

  /** Shows the bubble, if it has content. */
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

  /**
   * Hides the bubble, and cancels a pending show.
   *
   * The timer matters as much as the state: a pointer that arrives and leaves
   * inside the delay left one queued, and the tooltip appeared over whatever
   * the reader had moved on to.
   */
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

  /**
   * Shows after the pointer has rested for `delay`, or at once while the
   * tooltips are warm.
   *
   * **Warm is another tooltip showing, or one that hid within `skipDelay`.**
   * A reader scanning a toolbar has already waited once, and waiting again on
   * every control turns the scan into a series of pauses.
   */
  private readonly showLater = (): void => {
    if (this.showOn === 'focus') {
      return
    }
    this.holds.add('pointer')
    clearTimeout(this.timer)
    const warm = warmth()
    const others = [...warm.showing].some((one) => one !== this)
    if (others || performance.now() - warm.hidAt < this.skipDelay) {
      this.show()
      return
    }
    this.timer = setTimeout(() => this.show(), this.delay)
  }

  /**
   * The pointer reached the bubble, in the `for` form.
   *
   * The bubble is not inside the element `for` names, so moving onto it leaves
   * the trigger and would hide it after `delay-out`. WCAG 1.4.13 asks that a
   * reader can move onto it, to read it under a magnifier or to select its
   * text. Wrapping, the bubble is inside the host and the host's own pointer
   * listeners already hold it.
   */
  private readonly holdOnBubble = (): void => {
    if (!this.named) {
      return
    }
    this.holds.add('pointer')
    clearTimeout(this.timer)
  }

  /** The pointer left the bubble, in the `for` form. */
  private readonly leaveBubble = (): void => {
    if (this.named) {
      this.hideLater()
    }
  }

  /** Hides after `delayOut`, so crossing the gap to the bubble does not close it. */
  private readonly hideLater = (): void => {
    this.holds.delete('pointer')
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.release(), this.delayOut)
  }

  /**
   * Focus opens the bubble, but only the kind of focus a reader chose.
   *
   * **A mouse press focuses the button it pressed**, so an unconditional focus
   * hold leaves the bubble up after any click for a reader who was not asking
   * for it: moving the pointer away releases the pointer hold, finds a focus
   * hold still set, and leaves the tooltip on screen until something else blurs
   * the control. `persist` is what makes that reachable, activation otherwise
   * clearing every hold before anyone can see it.
   *
   * `:focus-visible` is the platform's own answer to "did they mean it", and a
   * button does not match it on a mouse press. Keyboard focus still opens with no
   * delay, which is the case this branch exists for: a reader who tabbed to a
   * control has already committed to it. Where it does not match there is nothing
   * to do, the pointer having opened the bubble already if a pointer is involved.
   */
  private readonly showNow = (event: Event): void => {
    /* **The element that took focus, not the one the event names.** A
       `focusin` from inside a shadow root arrives retargeted to its host, and a
       host whose button has keyboard focus matches `:focus` but not
       `:focus-visible`: measured with a real Tab onto a `Button`, the button
       inside matched and its host did not. So a tooltip for any Helix control
       never opened for a keyboard reader, the one reader it opens at once for.
       `composedPath` reaches through an open root to what was focused. */
    const focused = event.composedPath()[0] ?? event.target
    if (focused instanceof Element && !focused.matches(':focus-visible')) {
      return
    }
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
   * Activating the trigger closes the bubble.
   *
   * A tooltip is a hint about what a control will do, and once the control has
   * been used the hint is spent. Nothing else takes it down either:
   * `pointerleave` cannot fire while the pointer is still on the button it just
   * pressed, and `focusout` does not fire when activation leaves focus where it
   * was. Without this, a gear that opened a drawer leaves its own label
   * floating over the drawer until the reader moves the mouse away.
   *
   * `click` rather than `pointerdown`, because it is the one event both a mouse
   * and a keyboard produce: Enter and Space on a focused button raise it, and a
   * hint that outlived activation for keyboard readers alone would be the same
   * bug with a smaller audience.
   *
   * Holds are cleared as well as hiding, the same as Escape. Leaving them set
   * means the pointer is still recorded as being over the trigger, so the next
   * `focusout` anywhere releases nothing and the bubble comes back on a
   * `release` it should have been dropped from.
   *
   * `persist` opts out entirely, holds included: a tooltip whose content becomes
   * the confirmation has not spent its hint, it has changed it, and the pointer
   * really is still over the trigger. See the property.
   */
  private readonly handleActivate = (): void => {
    if (this.persist) {
      return
    }
    this.holds.clear()
    this.hide()
  }

  /**
   * What the pointer and focus listeners are currently on.
   *
   * Held, rather than recomputed at removal time, because what `for` names can
   * change: unbinding from wherever the element is *now* leaves a live listener
   * on wherever it was, and a tooltip that opens from a control it no longer
   * describes is worse than one that does not open at all.
   */
  private bound: HTMLElement | undefined

  /**
   * Puts the listeners on whatever the trigger is.
   *
   * The host when it wraps, since the trigger is inside it and both `focusin`
   * and `focusout` bubble. The named element when `for` is set, because then the
   * host wraps nothing and `pointerenter` does not bubble at all.
   *
   * Client only, and after the first render: `for` names an element that may not
   * have upgraded, or existed, when this one connected.
   */
  private bind(): void {
    const target = this.named ?? this
    if (this.bound === target) {
      return
    }
    this.unbind()
    /* Before the listeners that open the bubble, so the link is in place when
       a screen reader reads the control focus has just landed on. */
    target.addEventListener('pointerenter', this.linkOnArrival)
    target.addEventListener('focusin', this.linkOnArrival)
    target.addEventListener('pointerenter', this.showLater)
    target.addEventListener('pointerleave', this.hideLater)
    // Focus opens at once: a keyboard reader landing on a control has already
    // committed to it, where a pointer crossing one has not.
    target.addEventListener('focusin', this.showNow)
    target.addEventListener('focusout', this.releaseFocus)
    target.addEventListener('click', this.handleActivate)
    this.bound = target
    /* A Helix trigger is described at once, inside its own shadow root, once
       it has drawn the control that takes its focus. */
    this.link(false)
    const drawn = (this.trigger as Partial<{ updateComplete: Promise<unknown> }>).updateComplete
    void drawn?.then(() => {
      if (this.bound === target) {
        this.link(false)
      }
    })
  }

  /** The control this tooltip has described, so the link can be taken back. */
  private linked: Element | undefined

  /**
   * Describes the control that takes the trigger's focus by this tooltip.
   *
   * `light` says a reader has just acted, which is what allows a write onto a
   * plain element in the consumer's markup. See `linkDescription`.
   */
  private link(light: boolean, target: Element = focusTarget(this.trigger)): void {
    if (this.linked === target) {
      return
    }
    if (this.linked) {
      unlinkDescription(this.linked, this)
      this.linked = undefined
    }
    if (linkDescription(target, this, light)) {
      this.linked = target
    }
  }

  /** A reader arriving on the trigger, which is late enough to write the link. */
  private readonly linkOnArrival = (event: Event): void => {
    const first = event.composedPath()[0]
    this.link(true, event.type === 'focusin' && first instanceof Element ? first : undefined)
  }

  private unbind(): void {
    if (this.linked) {
      unlinkDescription(this.linked, this)
      this.linked = undefined
    }
    this.bound?.removeEventListener('pointerenter', this.linkOnArrival)
    this.bound?.removeEventListener('focusin', this.linkOnArrival)
    this.bound?.removeEventListener('pointerenter', this.showLater)
    this.bound?.removeEventListener('pointerleave', this.hideLater)
    this.bound?.removeEventListener('click', this.handleActivate)
    this.bound?.removeEventListener('focusin', this.showNow)
    this.bound?.removeEventListener('focusout', this.releaseFocus)
    this.bound = undefined
  }

  /** Said once per element, however many times it opens. */
  private audited = false

  /**
   * Checks that the trigger actually points back, and says so once if not.
   *
   * `for` is only half a link: this element finds the trigger, and the trigger
   * has to name this element for a screen reader to read the two together. That
   * second half is the consumer's line to write, deliberately, because writing
   * it from here means `setAttribute` on markup they server-rendered. So it is
   * theirs to forget, and a silent accessibility gap is the worst kind: the
   * tooltip looks completely correct.
   *
   * On first open rather than on connect, because a framework may render the
   * attribute after this element upgrades, and because a tooltip that never
   * opens has described nothing either way.
   *
   * Either attribute counts. WebAwesome uses `aria-labelledby` over
   * `aria-describedby` on purpose, their reasoning being that some screen
   * readers want the description on the focusable element itself while a label
   * reads on first focus regardless, and that is a live enough question that
   * this should not be the thing to settle it.
   */
  private auditDescription(): void {
    if (this.audited || !this.hasContent) {
      return
    }
    this.audited = true
    /* Described already, by the link this element made or the consumer wrote. */
    if (this.linked) {
      return
    }
    /* **The unlinked form is the one that describes nothing, so it is the one
       warned about.** This returned on `for === ''`, which made the guard the
       exact inverse of the risk: the wrapping form is never linked, so it was
       the single form that could never be reported.

       Measured in Chrome's accessibility tree,
       `<helix-headless-tooltip content="..."><helix-headless-button>Save</helix-headless-button></helix-headless-tooltip>`
       exposes `button name="Save" desc=""`. All three routes to fixing it are
       closed: an `aria-describedby` IDREF resolves only within one tree,
       `ariaDescribedByElements` is valid outward and this points inward, and
       `aria-description` is a hydration mismatch this library refuses. So the
       wrapping form is not the documented API, and this says so once, where
       somebody using it will see it. */
    if (this.for === '') {
      /* **Unless the trigger's name already says it.** An icon button named
         Settings under a tooltip reading Settings loses a reader nothing, and
         that is the case the wrapping form is documented for. A component that
         renders one in its own shadow root, as `CopyButton` does, is that case
         too, and its consumer could not have acted on the warning. */
      if (this.triggerSays(this.describedText)) {
        return
      }
      reportRuntime({
        kind: 'wrapped-trigger',
        message:
          `<${this.localName}> is wrapping its trigger rather than naming one, so its text ` +
          "reaches no screen reader: a description in this element's shadow root cannot be " +
          'referenced from a trigger in the light DOM. Give this tooltip an `id`, set `for` to ' +
          'the trigger\'s id, and add `aria-describedby="<that id>"` to the trigger.',
        tag: this.localName,
      })
      return
    }
    const trigger = this.named
    if (!trigger) {
      reportRuntime({
        kind: 'missing-trigger',
        message:
          `<${this.localName} for="${this.for}"> found no element with that id in its own tree, ` +
          'so it has nothing to describe and nothing to point at. Ids resolve per tree: an ' +
          'element inside another shadow root is not reachable from here.',
        tag: this.localName,
      })
      return
    }
    const names = `${trigger.getAttribute('aria-describedby') ?? ''} ${
      trigger.getAttribute('aria-labelledby') ?? ''
    }`
      .split(/\s+/)
      .filter(Boolean)
    if (this.id !== '' && names.includes(this.id)) {
      return
    }
    reportRuntime({
      kind: 'unlinked-trigger',
      message:
        `<${this.localName} for="${this.for}"> is not read out with its trigger. The link is ` +
        'written from the trigger, not from here: give this tooltip an `id` and add ' +
        '`aria-describedby="<that id>"` to the element it names. Written in your own markup ' +
        'it survives server rendering, which is why this element will not write it for you.',
      tag: this.localName,
    })
  }

  /**
   * Whether the wrapped trigger's own name is the tooltip's text.
   *
   * The name a consumer writes: `aria-label`, then a `label` a Helix control
   * renders as its name, then the trigger's text.
   */
  private triggerSays(text: string): boolean {
    const flat = (words: string | null | undefined): string =>
      (words ?? '').replace(/\s+/gu, ' ').trim()
    const trigger = this.trigger
    const name =
      trigger.getAttribute('aria-label') ?? trigger.getAttribute('label') ?? trigger.textContent
    return text !== '' && flat(name) === flat(text)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* Bound again on a move, since the disconnect unbinds and `firstUpdated`
       happens once: a tooltip in a list a framework reordered stopped opening.
       Only on a re-connect, the first waiting for `firstUpdated`. */
    if (this.hasUpdated) {
      this.bind()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unbind()
    this.holds.clear()
    clearTimeout(this.timer)
    warmth().showing.delete(this)
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.bind()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* Raised and lowered from the resolved state, so a bubble opened by
       declaring `open` takes the same path as one opened by a pointer. Here
       rather than a microtask later: the render has been written, so the bubble
       is no longer `display: none` and `showPopover` is safe on it. */
    if (changed.has('for')) {
      this.bind()
    }
    if (changed.has('open')) {
      const warm = warmth()
      if (this.open) {
        /* One bubble at a time, as a reader moving along a toolbar expects:
           the one they left goes as the next one shows. */
        for (const other of [...warm.showing]) {
          if (other !== this) {
            other.holds.clear()
            other.hide()
          }
        }
        warm.showing.add(this)
        this.bubbleLayer.show()
        this.auditDescription()
      } else {
        if (warm.showing.delete(this)) {
          warm.hidAt = performance.now()
        }
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
     * A string would cross, and `aria-description` on the trigger was tried:
     * it works, and it is a hydration mismatch. The trigger is the consumer's
     * own element, React rendered it on the server without that attribute, and
     * writing it at upgrade is exactly what this library declines to do
     * everywhere else. Measured against the site's own header: React logged the
     * mismatch on every tooltip on the page and said it would not patch it up.
     *
     * So the description stays on the host, and the trigger reaches it by a
     * reference from outside instead, which `link` writes: inward is the one
     * direction a reference cannot go, and the host is outward of the trigger
     * in both forms. The host names itself with the bubble's words for that
     * reason. Where the trigger is the consumer's own plain element, the link is
     * written only after a reader has acted on it, which is after hydration;
     * `linkDescription` says the rest. */
    hostAria(this.internals, {
      describedBy: this.hasContent ? [bubble] : [],
      /* **And the host names itself, which is what makes `for` work when the
         bubble is down.**
       *
       * A reference resolves to the referenced element's accessible *name*, and
       * that name comes from `aria-labelledby`, then `aria-label`, then the
       * element's contents, in that order. Only the third can be defeated by
       * the contents being `display: none`, which is exactly what a closed
       * popover is. So without a name of its own the host describes nothing
       * until the bubble is already up, and a screen reader computes a
       * description when focus lands, which is a frame or two before that.
       *
       * Measured, one page, two identical tooltips:
       *
       *   CLOSED  bare host     (none)
       *   CLOSED  labeled host Description B
       *   OPEN    bare host     Description A
       *   OPEN    labeled host Description B
       *
       * In both forms, since the host is what the trigger's link references
       * whether it wraps the trigger or sits beside it. */
      label: this.describedText,
    })
  }

  protected override render(): TemplateResult {
    const side = this.side
    return html`<slot></slot>
      <div
        part="tooltip${side ? { bottom: ' tooltip-bottom', left: ' tooltip-left', right: ' tooltip-right', top: ' tooltip-top' }[side] : ''}"
        popover="manual"
        role="tooltip"
        @pointerenter=${this.holdOnBubble}
        @pointerleave=${this.leaveBubble}
      >
        <span
          part="arrow${side ? { bottom: ' arrow-bottom', left: ' arrow-left', right: ' arrow-right', top: ' arrow-top' }[side] : ''}"
        ></span>
        <slot name="content" @slotchange=${this.handleContentChange}
          >${this.content}</slot
        >
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-tooltip': HelixHeadlessTooltip
  }
}
