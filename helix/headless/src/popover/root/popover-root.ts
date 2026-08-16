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
    boundary: () => this,
    offset: () => this.offset,
    onDismiss: () => this.hide(),
    placement: () => this.placement,
    surface: () => this.renderRoot?.querySelector<HTMLElement>('[part="popover"]'),
  })

  protected readonly commands = new CommandController(this, {
    commands: {
      '--close': () => this.hide(),
      '--show': () => this.show(),
      '--toggle': () => (this.isOpen ? this.hide() : this.show()),
    },
  })

  /** The element the panel opens against. */
  private get trigger(): HTMLElement {
    return anchorElement(
      this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]'),
      this,
    )
  }

  /** Opens the panel. */
  show(): void {
    if (this.isOpen || !this.requestOpen(true)) {
      return
    }
    // After the render that unhides it: `showPopover` on an element still
    // `display: none` throws, and measuring one gives zeroes.
    this.updateComplete.then(() => this.panel.show())
  }

  /** Closes the panel and puts focus back on the trigger. */
  hide(): void {
    if (!this.isOpen || !this.requestOpen(false)) {
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
    if (this.isOpen) {
      this.hide()
    } else {
      this.show()
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label })
  }

  protected override render(): TemplateResult {
    return html`<slot name="trigger" @click=${this.handleTriggerClick}></slot>
      <div part="popover" popover="manual" ?hidden=${!this.isOpen}>
        <slot></slot>
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-popover': HelixBasePopover
  }
}
