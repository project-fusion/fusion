import {
  anchorElement,
  CommandController,
  customElement,
  HelixElement,
  hostAria,
  MixinControllerOpen,
  type Placement,
  PopoverController,
} from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A panel that opens against a trigger and holds anything.
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
 * @status experimental
 * @aliases Popper, Flyout, Overlay
 * @documentation https://helix.fusion.dev/components/popover
 *
 * @slot trigger - What opens it.
 * @slot - The contents of the panel.
 *
 * @csspart popover - The panel.
 *
 * @event {HelixOpenEvent} helix-open - Fired before it opens, and cancelable.
 * @event {HelixCloseEvent} helix-close - Fired before it closes, and cancelable.
 */
@customElement('helix-base-popover')
export class HelixBasePopover extends MixinControllerOpen(HelixElement) {
  /** Accessible name for the panel. */
  @property()
  label = 'Popover'

  /** Space between the trigger and the panel, in pixels. */
  @property({ type: Number })
  offset = 4

  /** Preferred side. It moves if that side does not fit. */
  @property()
  placement: Placement = 'bottom-start'

  /* The panel, plus everything that has to happen around it: one controller
     rather than the three this took at every call site, which is what let
     `Select` quietly never reach the top layer at all.
   *
   * Called `panel` rather than `popover`, because `HTMLElement.popover` is the
   * popover API's own IDL attribute and a field of that name shadows it with
   * something of a different type. TypeScript objects; what it would have done
   * at runtime is break the API this is built on. */
  private readonly panel = new PopoverController(this, {
    anchor: () => this.trigger,
    /* The host, not the panel. `display: contents` leaves it without a box, so
       a press on the trigger is inside the host and outside the panel, and a
       boundary of the panel alone would close on the very press that opened
       it. */
    /* The host *and* whatever invoked it. An outside press is measured against
       this, and a `--toggle` button outside the host is part of the control by
       any reading a reader would give it: pressing it while the panel is open
       should close it once, not close it on `pointerdown` and reopen it on the
       `click` that follows. */
    boundary: (): (HTMLElement | undefined)[] => [this, this.invoker],
    offset: () => this.offset,
    onDismiss: () => this.hide(),
    placement: () => this.placement,
    surface: () => this.renderRoot?.querySelector<HTMLElement>('[part="popover"]'),
  })

  /**
   * The invoker that last opened the panel, when a command did.
   *
   * The handlers discarded the `source` the controller hands them, which cost
   * two things at once. The panel was positioned against the host, and the
   * styled tier makes the host a boxless `display: contents` element, so a
   * popover opened by a command outside it opened against the window origin.
   * And the outside-press dismissal had no way to know the invoker was part of
   * the control: the press fires on `pointerdown`, the command arrives on the
   * `click` after it, so a `--toggle` button outside the host closed the panel
   * and immediately reopened it, for ever.
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
    if (this.contains(document.activeElement)) {
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

  /**
   * Puts the panel where `open` says it should be, however it got there.
   *
   * `show()` and `hide()` raised and lowered it, and nothing else did, so a
   * panel opened by *declaring* `open` (or `default-open`, or a consumer
   * assigning the property) rendered visible and was never in the top layer and
   * never anchored. Every imperative path worked and every declarative one was
   * quietly half-open: clipped by the first ancestor with `overflow`, and
   * positioned wherever normal flow left it.
   *
   * Driving the controller from the resolved state rather than from the two
   * methods is what makes the two paths the same path. The controller ignores a
   * `show()` on something already raised, so this costs nothing when the
   * methods did the work.
   */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (!changed.has('open')) {
      return
    }
    /* Raised here rather than a microtask later, and `updated()` is what makes
       that safe: the render has already been written, so the panel is no longer
       `display: none` and `showPopover` will not throw on it. The old
       `show()` deferred to `updateComplete` precisely because it ran *before*
       the render; from here there is nothing left to wait for. */
    if (this.open) {
      this.panel.show()
    } else {
      this.panel.hide()
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label })
  }

  protected override render(): TemplateResult {
    return html`<slot name="trigger" @click=${this.handleTriggerClick}></slot>
      <div part="popover" popover="manual" ?hidden=${!this.open}>
        <slot></slot>
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-popover': HelixBasePopover
  }
}
