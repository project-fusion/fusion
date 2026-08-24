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
 * **Two forms, and they are not equivalent for a screen reader.**
 *
 * Wrapping is the convenience form and is right where the bubble decorates a
 * control that already says what it is. The trigger stays the consumer's own
 * element, slotted, and nothing here can describe it: an IDREF cannot cross a
 * shadow boundary, an element reference is valid only into the same tree or a
 * shadow-including *ancestor* (the bubble's tree is neither, it is inward), and
 * a string on the trigger means writing to markup the consumer server-rendered.
 * All three measured.
 *
 * `for` is the form that works. The tooltip sits *beside* the trigger in the
 * consumer's own tree and names it by id, so both are in one tree and an IDREF
 * between them is legal in the ordinary way:
 *
 * ```html
 * <helix-button id="save" aria-describedby="save-tip">Save</helix-button>
 * <helix-tooltip id="save-tip" for="save" content="Save your work"></helix-tooltip>
 * ```
 *
 * Note that the reference points at *this host*, not at the bubble inside its
 * shadow root: the description is computed from the flat tree, which descends
 * into shadow content on its own.
 *
 * **The consumer writes that `aria-describedby`, and nothing here writes it for
 * them.** WebAwesome and Spectrum Web Components both do write it, with
 * `setAttribute` on the trigger at runtime, which is the one thing this library
 * declines everywhere: React rendered that element on the server without the
 * attribute and reports a mismatch it will not patch up. Two ids in the markup
 * is the whole cost of the version that is correct before any JavaScript runs.
 *
 * Because it is the consumer's line to write, it is also theirs to forget, so
 * `for` audits itself on first open and says so once. Same shape as
 * `requestControlledChange` warning about a controlled property nothing
 * answered.
 *
 * It shows on hover and on focus, and hides on leave, on blur, on Escape, and
 * once the trigger has been activated: the hint is spent when the control has
 * been used.
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
 * @category overlays
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
 * @csspart arrow - The point, resting against the trigger.
 * @csspart tooltip - The bubble.
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
   * The id of the element this describes, in this tooltip's own tree.
   *
   * Set it and the tooltip stops wrapping: it renders no trigger, listens on
   * the element it names, and points its bubble there. Leave it unset and the
   * default slot is the trigger, which is the older form.
   *
   * Resolved through `getRootNode()`, so a tooltip inside another component's
   * shadow root names an element in that root rather than in the document.
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

  /** Preferred side. It moves if that side does not fit. */
  @property()
  placement: Placement = 'top'

  /**
   * Space between the trigger and the point of the bubble, in pixels.
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
   * The id of a box to keep the bubble inside, instead of the viewport.
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

  /** Whether the tooltip never shows. */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * Whether the bubble survives the trigger being used.
   *
   * **Activation takes a tooltip down, because a hint about what a control will
   * do is spent once the control has done it.** That is right for a gear that
   * opens a drawer and wrong for a control whose tooltip *becomes* the answer:
   * `CopyButton` swaps its content from Copy to Copied on the same click, so the
   * bubble was being hidden at the exact moment it had something to say. What a
   * reader saw was a flash, and the confirmation the component had carefully
   * written was never on screen long enough to read.
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
    /* Named, or slotted. The named one is looked up every time rather than
       cached: `for` can be pointed somewhere else, and the element it names can
       upgrade, move or be replaced by a framework without telling this. */
    const named = this.named
    if (named) {
      return named
    }
    /* Through the util, which was written from a measurement of this component
       and then not used by it. Its extra is the descent: the first assigned
       element may itself draw nothing, and an icon button wrapped in a
       `display: contents` span was the case that took the bubble to the corner
       of the window. */
    return anchorElement(this.renderRoot.querySelector<HTMLSlotElement>('slot:not([name])'), this)
  }

  /**
   * Places the bubble again, for an anchor that moved without the page moving.
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

  /**
   * The element `for` names, or null.
   *
   * `getRootNode()` rather than `document`, which is what makes this work inside
   * another component: an id is unique to a tree, and a tooltip in a shadow root
   * names an element in that root. Client only, since the server has no tree to
   * search.
   */
  private get named(): HTMLElement | null {
    if (this.for === '') {
      return null
    }
    const root = this.getRootNode() as Document | ShadowRoot
    return root.getElementById?.(this.for) ?? null
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
    offset: () => {
      const point = this.renderRoot.querySelector<HTMLElement>('[part="arrow"]')
      return this.offset + (point?.offsetWidth ?? 0) / Math.SQRT2
    },
    onDismiss: () => this.hide(),
    placement: () => this.placement,
    surface: () => this.renderRoot.querySelector<HTMLElement>('[part="tooltip"]'),
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
    if (this.within === '') {
      return null
    }
    const root = this.getRootNode()
    return root instanceof Document || root instanceof ShadowRoot
      ? root.getElementById(this.within)
      : null
  }

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

  /**
   * Closes the bubble, and cancels a show that had not happened yet.
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

  /**
   * Focus opens the bubble, but only the kind of focus a reader chose.
   *
   * **A mouse press focuses the button it pressed**, so an unconditional focus
   * hold meant that after any click the bubble was held up by a reader who was
   * not asking for it: moving the pointer away released the pointer hold, found
   * a focus hold still set, and left the tooltip on screen until something else
   * blurred the control.
   *
   * It never showed until `persist` arrived, because activation used to clear
   * every hold and hide, so the click path threw the stale hold away before
   * anyone could see it. A tooltip that survives its own activation is the first
   * one to hold that focus long enough to matter.
   *
   * `:focus-visible` is the platform's own answer to "did they mean it", and a
   * button does not match it on a mouse press. Keyboard focus still opens with no
   * delay, which is the case this branch exists for: a reader who tabbed to a
   * control has already committed to it. Where it does not match there is nothing
   * to do, the pointer having opened the bubble already if a pointer is involved.
   */
  private readonly showNow = (event: Event): void => {
    const focused = event.target
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
   * Activating the trigger closes the bubble, which nothing was doing.
   *
   * A tooltip is a hint about what a control will do, and once the control has
   * been used the hint is spent. Nothing else was going to take it down either:
   * `pointerleave` cannot fire while the pointer is still on the button it just
   * pressed, and `focusout` does not fire when activation leaves focus where it
   * was. So a gear that opened a drawer left its own label floating over the
   * drawer until the reader moved the mouse away.
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
    target.addEventListener('pointerenter', this.showLater)
    target.addEventListener('pointerleave', this.hideLater)
    // Focus opens at once: a keyboard reader landing on a control has already
    // committed to it, where a pointer crossing one has not.
    target.addEventListener('focusin', this.showNow)
    target.addEventListener('focusout', this.releaseFocus)
    target.addEventListener('click', this.handleActivate)
    this.bound = target
  }

  private unbind(): void {
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
   * opens has described nothing eitherway.
   *
   * Either attribute counts. WebAwesome uses `aria-labelledby` over
   * `aria-describedby` on purpose, their reasoning being that some screen
   * readers want the description on the focusable element itself while a label
   * reads on first focus regardless, and that is a live enough question that
   * this should not be the thing to settle it.
   */
  private auditDescription(): void {
    if (this.audited || this.for === '' || !this.hasContent) {
      return
    }
    this.audited = true
    const trigger = this.named
    if (!trigger) {
      console.warn(
        `<${this.localName} for="${this.for}"> found no element with that id in its own tree, ` +
          'so it has nothing to describe and nothing to point at. Ids resolve per tree: an ' +
          'element inside another shadow root is not reachable from here.',
      )
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
    console.warn(
      `<${this.localName} for="${this.for}"> is not read out with its trigger. The link is ` +
        'written from the trigger, not from here: give this tooltip an `id` and add ' +
        '`aria-describedby="<that id>"` to the element it names. Written in your own markup ' +
        'it survives server rendering, which is why this element will not write it for you.',
    )
  }

  override connectedCallback(): void {
    super.connectedCallback()
    document.addEventListener('keydown', this.handleKeydown)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unbind()
    document.removeEventListener('keydown', this.handleKeydown)
    this.holds.clear()
    clearTimeout(this.timer)
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
      if (this.open) {
        this.bubbleLayer.show()
        this.auditDescription()
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
     * A string would cross, and `aria-description` on the trigger was tried:
     * it works, and it is a hydration mismatch. The trigger is the consumer's
     * own element, React rendered it on the server without that attribute, and
     * writing it at upgrade is exactly what this library declines to do
     * everywhere else. Measured against the site's own header: React logged the
     * mismatch on every tooltip on the page and said it would not patch it up.
     *
     * So the description stays on the host and the gap is recorded rather than
     * papered over. There is no third option: a description has to live on the
     * element being described, that element belongs to the consumer, and the
     * bubble is in a tree no reference from there can name. Closing it means
     * either writing to the consumer's markup or moving the bubble into the
     * light DOM, and both are decisions rather than fixes. */
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
       * Only when `for` is set, because only then is this host the thing being
       * referenced. Wrapping, it is an ancestor of the trigger and naming it
       * would put a name on a box that is `display: contents`. */
      label: this.for === '' ? '' : this.describedText,
    })
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>
      <div part="tooltip" popover="manual" role="tooltip">
        <span part="arrow"></span>
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
