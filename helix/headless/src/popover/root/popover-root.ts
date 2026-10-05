import {
  AriaForwardController,
  anchorElement,
  CommandController,
  customElement,
  deepActiveElement,
  FocusScopeController,
  HelixElement,
  MixinControllerOpen,
  type Placement,
  PopoverController,
  type Side,
  tellDisclosure,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { headingIn } from '../heading.js'

/**
 * @summary A panel that opens next to its trigger and holds any content.
 *
 * @description
 * Popover is the general overlay that the specific ones build on. `Menu` holds
 * commands, `Select` holds options, and `Tooltip` holds a description. Popover
 * holds any content you put in it, so it has no keyboard handling of its own.
 *
 * The trigger is slotted and stays your own element. The popover writes nothing
 * onto it, including `aria-expanded`, `id`, and `tabindex`, because changing
 * your markup after upgrade causes a React hydration mismatch.
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
 * Without it the popover does not trap focus.
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
   * Keeps `Tab` inside the panel while it is open, and marks the panel
   * `aria-modal`. A press outside and Escape still close it.
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
    offset: () => this.offset + (this.partNamed('arrow')?.offsetWidth ?? 0) / Math.SQRT2,
    onDismiss: () => this.hide(),
    /* The side the panel landed on, for a sheet outside that draws by side,
       where no attribute can follow `::part()`. As `Tooltip` records it. */
    onPlace: (placement) => {
      const side = placement.split('-')[0] as Side
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
    const panel = this.partNamed('popover') as
      | (HTMLElement & { ariaLabelledByElements?: Element[] | null })
      | null
    if (!panel || !('ariaLabelledByElements' in panel)) {
      return
    }
    const asked = this.label !== 'Popover' || this.hasAttribute('aria-labelledby')
    const heading = asked ? null : headingIn(this.slotted)
    if (heading) {
      panel.ariaLabelledByElements = [heading]
      this.namedByHeading = true
    } else if (this.namedByHeading) {
      panel.ariaLabelledByElements = null
      this.namedByHeading = false
    }
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
    if (!this.open || !this.requestOpen(false)) {
      return
    }
    this.panel.hide()
    /* Only when focus is inside the panel that is going away. A popover
       dismissed by a press somewhere else has not taken focus with it, and
       pulling focus back to the trigger would move a reader who was already
       somewhere else on purpose. */
    /* `deepActiveElement`, which walks into shadow roots. `document.activeElement`
       stops at the outermost host, so a popover living inside another
       component's shadow root never saw its own focus and never gave it back to
       the trigger. The util exists for this. */
    if (this.contains(deepActiveElement())) {
      this.trigger.focus()
    }
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
    this.hide()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('focusout', this.handleFocusOut)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('focusout', this.handleFocusOut)
  }

  private readonly handleTriggerClick = (): void => {
    if (this.open) {
      this.hide()
    } else {
      this.show()
    }
  }

  /** Tells a slotted trigger the disclosure state, by property. See `tellDisclosure`. */
  private tellTrigger(): void {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
    tellDisclosure(slot?.assignedElements({ flatten: false })[0], this.open)
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
    /* Into the panel once it is up, which the controller has done by now, and
       never on the first update: a popover served open has not been opened by
       anybody, and taking focus as the page loads would move a reader who has
       not asked for anything. */
    if (changed.has('open') && this.open && changed.get('open') === false) {
      this.scope.enter()
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
