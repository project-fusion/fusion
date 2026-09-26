import {
  anchorElement,
  CommandController,
  customElement,
  deepActiveElement,
  HelixElement,
  MixinControllerOpen,
  type Placement,
  PopoverController,
  tellDisclosure,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A panel that opens next to its trigger and holds any content.
 *
 * @description
 * The general case the specific overlays are versions of. `Menu` holds
 * commands, `Select` holds options, `Tooltip` holds a description; this holds
 * whatever the consumer puts in it, which is why it has no keyboard of its own
 * and no opinion about what is inside.
 *
 * **The trigger is slotted and stays the consumer's own element.** Nothing is
 * written onto it: no `aria-expanded`, no `id`, no `tabindex`. A component that
 * decorates a consumer's markup after upgrading is a component whose output a
 * React consumer's hydration disagrees with, and the attribute they would care
 * about most is the one that changes on every open.
 *
 * **The panel is in the top layer**, through the popover API, so it clears any
 * ancestor with `overflow: hidden` without a `z-index` fight. `position: fixed`
 * does not do that: it is still clipped by `overflow`, and re-anchored entirely
 * by an ancestor carrying `transform`, `filter` or `contain`.
 *
 * **It opens on click, and from a command.** `command="--show"` and its
 * siblings work here the way they do on `Dialog` and `Drawer`, so a trigger
 * elsewhere on the page can open it without a line of script and without being
 * slotted into it.
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
 * @event {Event} toggle - Fired after the panel opens or closes, with `newState` and `oldState`.
 *
 * @csspart content - The scrolling region inside the panel.
 * @csspart popover - The panel.
 *
 * @cssstate open - While the popover is open.
 */
@customElement('helix-headless-popover')
export class HelixHeadlessPopover extends MixinControllerOpen(HelixElement) {
  /**
   * The panel's name, read by screen readers.
   */
  @property()
  label = 'Popover'

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
    /* The host *and* whatever invoked it, never the panel alone. An outside
       press is measured against this, and the host is not a box to rely on, a
       sheet being free to give it none, so a boundary of the panel alone would
       close on the very press that opened it. A `--toggle` button
       outside the host is part of the control by any reading a reader would
       give it: pressing it while the panel is open should close it once, not
       close it on `pointerdown` and reopen it on the `click` that follows. */
    boundary: (): (HTMLElement | undefined)[] => [this, this.invoker],
    offset: () => this.offset,
    onDismiss: () => this.hide(),
    open: () => this.open,
    placement: () => this.placement,
    surface: () => this.partNamed('popover'),
  })

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
  }

  protected override render(): TemplateResult {
    return html`<slot name="trigger" @click=${this.handleTriggerClick}></slot>
      <div
        part="popover"
        popover="manual"
        role="dialog"
        aria-label=${this.label}
        ?hidden=${!this.open}
      >
        <div part="content"><slot></slot></div>
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-popover': HelixHeadlessPopover
  }
}
