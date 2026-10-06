import {
  AriaForwardController,
  anchorElement,
  arrowReach,
  CommandController,
  customElement,
  deepActiveElement,
  FocusScopeController,
  HelixElement,
  headingIn,
  MixinControllerOpen,
  OpenPhaseController,
  type Placement,
  PopoverController,
  reflectElements,
  type Side,
  sideOf,
  tellDisclosure,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { hideOutside } from '../hide-outside.js'

/**
 * @summary A panel that opens next to its trigger and holds any content.
 *
 * @description
 * Popover is the general overlay that the specific ones build on. `Menu` holds
 * commands, `Select` holds options, and `Tooltip` holds a description. Popover
 * holds any content you put in it, so it has no keyboard handling of its own.
 *
 * The trigger is slotted and stays your own element. A Helix trigger is told
 * whether the popover is open inside its own shadow root. On a plain element,
 * such as a `<button>`, the popover writes `aria-expanded` only once a reader
 * has pressed it, which is after any hydration, and never where you wrote
 * `aria-expanded` yourself. It writes nothing else onto your markup.
 *
 * The panel is in the top layer through the popover API, so it needs no
 * `z-index`, and an ancestor with `overflow: hidden`, `transform`, `filter`, or
 * `contain` does not clip or move it.
 *
 * It opens on click and from a command. `command="--show"` and the related
 * commands work as they do on `Dialog` and `Drawer`, so a button anywhere on
 * the page can open the popover with no script.
 *
 * **Opening moves focus into the panel**, to the first control in it, or to the
 * panel itself where it holds none, and closing from inside gives it back to
 * the trigger. It closes on Escape, on a press outside it, and when focus moves
 * out of the trigger and the panel to somewhere else on the page.
 *
 * `modal` keeps `Tab` inside the panel while it is open and says so with
 * `aria-modal`, for a panel that has to be answered before the page goes on.
 * The rest of the page is hidden from screen readers with `aria-hidden` while
 * it is open, so the virtual cursor stays in the panel too. Without it the
 * popover does not trap focus.
 *
 * The panel's name is `label` when you set it. Otherwise it is the first
 * heading in the panel, or the elements an `aria-labelledby` on the host names.
 *
 * `arrow` draws a point on the panel's edge facing the trigger. The side the
 * panel landed on is on the host as `:state(placed-top)` and its kin, and the
 * trigger's width is on the panel as `--floating-anchor-inline-size`, for a
 * panel as wide as its trigger:
 *
 * ```css
 * helix-popover::part(popover) {
 *   min-inline-size: var(--floating-anchor-inline-size);
 * }
 * ```
 *
 * @since 0.1.0
 * @status stable
 * @category overlays
 * @aliases Popper, Flyout, Overlay
 * @documentation https://fusion.dev/helix/components/popover
 *
 * @slot - The contents of the panel.
 * @slot trigger - The element that opens the panel.
 *
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before it closes, and cancelable.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before it opens, and cancelable.
 * @event {ToggleEvent} toggle - Fired after the panel opens or closes, with `newState` and `oldState`.
 *
 * @csspart arrow - The point on the panel's edge facing the trigger, drawn with `arrow`.
 * @csspart arrow-bottom - Added to `arrow` while the panel is below its trigger, with the point on the panel's top edge.
 * @csspart arrow-left - Added to `arrow` while the panel is left of its trigger, with the point on the panel's right edge.
 * @csspart arrow-right - Added to `arrow` while the panel is right of its trigger, with the point on the panel's left edge.
 * @csspart arrow-top - Added to `arrow` while the panel is above its trigger, with the point on the panel's bottom edge.
 * @csspart content - The scrolling region inside the panel.
 * @csspart popover - The panel.
 *
 * @cssproperty --floating-anchor-inline-size - The trigger's width, written on the panel while it is open, as in `min-inline-size: var(--floating-anchor-inline-size)`. Read it; a value set here is written over.
 * @cssproperty --floating-available-block-size - The room between the panel and the edge of the screen it opens toward, written on the panel while it is open. Read it; a value set here is written over.
 *
 * @cssstate entering - From the moment the panel shows until its entrance has finished.
 * @cssstate exiting - From the moment the panel hides until its exit has finished.
 * @cssstate open - While the popover is open.
 * @cssstate placed-bottom - While the panel sits below its trigger.
 * @cssstate placed-left - While the panel sits to the left of its trigger.
 * @cssstate placed-right - While the panel sits to the right of its trigger.
 * @cssstate placed-top - While the panel sits above its trigger.
 */
@customElement('helix-headless-popover')
export class HelixHeadlessPopover extends MixinControllerOpen(HelixElement) {
  /**
   * Draws a point on the panel's edge facing the trigger.
   *
   * Off by default, which is the house style: a panel that opens from its
   * trigger already reads as belonging to it.
   */
  @property({ type: Boolean })
  arrow = false

  /**
   * The panel's name, read by screen readers. Left at `Popover`, the first
   * heading in the panel names it instead.
   */
  @property()
  label = 'Popover'

  /**
   * Keeps `Tab` inside the panel while it is open, marks the panel
   * `aria-modal`, and hides the rest of the page from screen readers. A press
   * outside and Escape still close it.
   */
  @property({ type: Boolean })
  modal = false

  /* `aria-labelledby` and `aria-describedby` written on the host, carried to
     the panel, which is the `dialog` a reader is on. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('popover'),
  })

  /**
   * Space between the trigger and the panel, in pixels.
   */
  @property({ type: Number })
  offset = 4

  /**
   * Preferred side.
   *
   * It moves if that side does not fit.
   */
  @property()
  placement: Placement = 'bottom-start'

  /* The panel, plus everything that has to happen around it.
   *
   * Called `panel` rather than `popover`, because `HTMLElement.popover` is the
   * popover API's own IDL attribute and a field of that name shadows it with
   * something of a different type. TypeScript objects; what it would have done
   * at runtime is break the API this is built on. */
  /* On its way in or out, for a sheet that draws the journey: `:state(open)`
     turns at once, which is too early for an exit to know it is one. */
  protected readonly phases = new OpenPhaseController(this, {
    mark: {
      entering: (on) => this.toggleState('entering', on),
      exiting: (on) => this.toggleState('exiting', on),
    },
    open: () => this.open,
    surface: () => this.partNamed('popover'),
  })

  private readonly panel = new PopoverController(this, {
    anchor: () => this.trigger,
    arrow: () => this.partNamed('arrow'),
    /* The host *and* whatever invoked it, never the panel alone. An outside
       press is measured against this, and the host is not a box to rely on, a
       sheet being free to give it none, so a boundary of the panel alone would
       close on the very press that opened it. A `--toggle` button
       outside the host is part of the control by any reading a reader would
       give it: pressing it while the panel is open should close it once, not
       close it on `pointerdown` and reopen it on the `click` that follows. */
    boundary: (): (HTMLElement | undefined)[] => [this, this.invoker],
    /* Measured to the point where there is one, as `Tooltip` measures it: the
       arrow is a square turned on its center, which reaches `n / sqrt(2)` past
       the edge it sits on. */
    offset: () => this.offset + arrowReach(this.partNamed('arrow')),
    onDismiss: () => this.hide(),
    /* The side the panel landed on, for a sheet outside that draws by side,
       where no attribute can follow `::part()`. As `Tooltip` records it. */
    onPlace: (placement) => {
      const side = sideOf(placement)
      this.toggleState('placed-bottom', side === 'bottom')
      this.toggleState('placed-left', side === 'left')
      this.toggleState('placed-right', side === 'right')
      this.toggleState('placed-top', side === 'top')
      this.side = side
    },
    open: () => this.open,
    placement: () => this.placement,
    surface: () => this.partNamed('popover'),
  })

  /**
   * The side of its trigger the panel last landed on, which names the arrow's
   * second part. Undefined until the first placement, which the server never
   * makes.
   */
  @state()
  private side?: Side

  /* Focus into the panel on the way in and back on the way out, and kept in
     while `modal`. */
  private readonly scope = new FocusScopeController(this, {
    contain: () => this.modal && this.open,
    contents: () => this.slotted,
    surface: () => this.partNamed('popover'),
  })

  /** What is assigned to the panel's slot. */
  private get slotted(): Element[] {
    return (
      this.renderRoot
        ?.querySelector<HTMLSlotElement>('slot:not([name])')
        ?.assignedElements({ flatten: true }) ?? []
    )
  }

  /** Whether the first heading in the panel is what names it. */
  private namedByHeading = false

  /**
   * Names the panel by its first heading, where `label` was left alone and no
   * `aria-labelledby` on the host names it. An element reference, for the
   * reason `Dialog` gives.
   */
  private nameByHeading(): void {
    const asked = this.label !== 'Popover' || this.hasAttribute('aria-labelledby')
    const heading = asked ? null : headingIn(this.slotted)
    this.namedByHeading = reflectElements(
      this.partNamed('popover'),
      'ariaLabelledByElements',
      heading ? [heading] : [],
      this.namedByHeading,
    )
  }

  /**
   * The invoker that last opened the panel, when a command did.
   *
   * Kept because the `source` a command hands the handlers is needed twice
   * over. It is the anchor: the host is not a box to position against, a sheet
   * being free to give it none, so a popover opened by a command outside it
   * would otherwise open against the window origin. And the outside-press
   * dismissal has to know the invoker is part of the control, the press firing
   * on `pointerdown` and the command arriving on the `click` after it, or a
   * `--toggle` button outside the host closes the panel and immediately reopens
   * it, for ever.
   */
  private invoker: HTMLElement | undefined

  protected readonly commands = new CommandController(this, {
    commands: {
      '--close': () => this.hide(),
      '--show': (source: Element | null) => {
        this.invoker = source instanceof HTMLElement ? source : undefined
        this.show()
      },
      '--toggle': (source: Element | null) => {
        this.invoker = source instanceof HTMLElement ? source : undefined
        if (this.open) {
          this.hide()
        } else {
          this.show()
        }
      },
    },
  })

  /** The element the panel opens against. */
  private get trigger(): HTMLElement {
    /* The invoker first, where there is one: a command names the element the
       reader actually pressed, and it is a better anchor than a slotted trigger
       the consumer may not have provided at all. */
    return (
      this.invoker ??
      anchorElement(this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]'), this)
    )
  }

  /** Opens the panel. */
  show(): void {
    if (this.open || !this.requestOpen(true)) {
      return
    }
    // The raising happens in `updated()`, which `requestOpen` has just
    // scheduled: one path for both the imperative and the declarative case.
  }

  /** Closes the panel and puts focus back on the trigger. */
  hide(): void {
    this.close(true)
  }

  /**
   * Closes the panel, giving focus back to the trigger where `giveBack` is set
   * and focus is inside the panel that is going away. A popover dismissed by a
   * press somewhere else has not taken focus with it, and pulling focus back to
   * the trigger would move a reader who was already somewhere else on purpose.
   */
  private close(giveBack: boolean): void {
    if (!this.open || !this.requestOpen(false)) {
      return
    }
    this.panel.hide()
    if (giveBack && this.focusInside) {
      this.trigger.focus()
    }
  }

  /**
   * Whether focus is in the panel, on the panel itself or on anything slotted
   * into it. `deepActiveElement`, which walks into shadow roots:
   * `document.activeElement` stops at the outermost host, so a popover living
   * inside another component's shadow root would never see its own focus.
   */
  private get focusInside(): boolean {
    return this.scope.holdsFocus || this.contains(deepActiveElement())
  }

  /**
   * Whether the update under way closes the panel while focus is inside it,
   * read before the panel is hidden and focus has fallen to the body.
   */
  private closingFromInside = false

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* However the panel closes: `hide()` has already moved focus, so this is
       the path where `open` itself was set, as a controlled popover in React
       or Vue closes it. */
    this.closingFromInside =
      changed.has('open') && !this.open && changed.get('open') === true && this.focusInside
  }

  /**
   * Focus leaving the control closes the panel.
   *
   * A popover does not trap focus, so `Tab` past its last control walks on
   * into the page, and a panel left open there covers what the reader moved
   * to. Focus moving between the trigger, the panel and a command's invoker
   * stays inside the control. With no `relatedTarget`, focus left the
   * document or went nowhere, and a press outside is already its own signal.
   */
  private readonly handleFocusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget
    if (!this.open || !(next instanceof Node)) {
      return
    }
    if (this.contains(next) || this.renderRoot.contains(next) || this.invoker?.contains(next)) {
      return
    }
    /* Focus is already on its way to `next`, which is where the reader went. */
    this.close(false)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('focusout', this.handleFocusOut)
    this.addEventListener('click', this.notePress, { capture: true })
  }

  /**
   * A press on the slotted trigger, heard on the host on the way down, before
   * the trigger slot's own listener opens the panel and the update that
   * schedules reads it in `tellTrigger`.
   */
  private readonly notePress = (event: Event): void => {
    const trigger = this.renderRoot
      ?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
      ?.assignedElements({ flatten: false })[0]
    if (trigger && event.composedPath().includes(trigger)) {
      this.pressed = true
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('focusout', this.handleFocusOut)
    this.removeEventListener('click', this.notePress, { capture: true })
    this.hideAround()
  }

  private readonly handleTriggerClick = (): void => {
    if (this.open) {
      this.hide()
    } else {
      this.show()
    }
  }

  /** Whether a reader has pressed the trigger, which is after any hydration. */
  private pressed = false

  /** The plain trigger this popover writes `aria-expanded` on, once it may. */
  private told: Element | undefined

  /**
   * Tells a slotted trigger the disclosure state.
   *
   * A Helix trigger by property, through `tellDisclosure`. A plain element,
   * which has no shadow root to keep the state out of the markup, by
   * `aria-expanded`, and only from a reader's first press on: by then a server
   * or a framework has long finished writing the element, so the write cannot
   * be a hydration mismatch. One that already carries `aria-expanded` is the
   * consumer's to keep, and is left alone.
   */
  private tellTrigger(): void {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
    const trigger = slot?.assignedElements({ flatten: false })[0]
    if (!trigger || trigger.localName.includes('-')) {
      tellDisclosure(trigger, this.open)
      return
    }
    if (trigger !== this.told) {
      if (!this.pressed || trigger.hasAttribute('aria-expanded')) {
        return
      }
      this.told = trigger
    }
    trigger.setAttribute('aria-expanded', String(this.open))
  }

  /** Whether the first update, which is the server's, has passed. */
  private settled = false

  /** Shows the page again, while a modal panel has it hidden. */
  private showOutside: (() => void) | undefined

  /** Hides the page outside a modal panel while it is open, and shows it again after. */
  private hideAround(): void {
    const hide = this.open && this.modal && this.isConnected
    if (hide && !this.showOutside) {
      this.showOutside = hideOutside([this, ...(this.invoker ? [this.invoker] : [])])
    } else if (!hide && this.showOutside) {
      this.showOutside()
      this.showOutside = undefined
    }
  }

  /**
   * Puts the panel where `open` says it should be, however it got there.
   *
   * Driven from the resolved state rather than from `show()` and `hide()`,
   * which is what makes the imperative and the declarative paths one path. Left
   * to the two methods, a panel opened by *declaring* `open` (or `default-open`,
   * or a consumer assigning the property) renders visible while never reaching
   * the top layer and never being anchored: clipped by the first ancestor with
   * `overflow`, and positioned wherever normal flow left it. The controller
   * ignores a `show()` on something already raised, so this costs nothing when
   * the methods did the work.
   */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* Every update, not only the ones that move `open`: a trigger slotted after
       the first render has to be told too, and a slot change is not a property
       change. Idempotent, so saying it twice costs an assignment Lit compares
       and discards. */
    this.tellTrigger()
    this.nameByHeading()
    /* Never on the first update for the same reason as focus below: a popover
       served open was opened by nobody, and the page it would hide is the
       server's. */
    if (this.settled) {
      this.hideAround()
    }
    this.settled = true
    /* Into the panel once it is up, which the controller has done by now, and
       never on the first update: a popover served open has not been opened by
       anybody, and taking focus as the page loads would move a reader who has
       not asked for anything. */
    if (changed.has('open') && this.open && changed.get('open') === false) {
      this.scope.enter()
    }
    if (this.closingFromInside) {
      this.closingFromInside = false
      this.trigger.focus()
    }
  }

  protected override render(): TemplateResult {
    return html`<slot name="trigger" @click=${this.handleTriggerClick}></slot>
      <div
        part="popover"
        popover="manual"
        role="dialog"
        aria-label=${this.label}
        aria-modal=${this.modal ? 'true' : nothing}
        tabindex="-1"
        ?hidden=${!this.open}
      >
        ${
          this.arrow
            ? html`<div
                part="arrow${this.side ? { bottom: ' arrow-bottom', left: ' arrow-left', right: ' arrow-right', top: ' arrow-top' }[this.side] : ''}"
                aria-hidden="true"
              ></div>`
            : nothing
        }
        <div part="content"><slot @slotchange=${this.nameByHeading}></slot></div>
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-popover': HelixHeadlessPopover
  }
}
