import {
  anchorElement,
  customElement,
  HelixElement,
  KeyboardNavigationController,
  MixinControllerOpen,
  type Placement,
  PopoverController,
} from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import type { HelixBaseSpeedDialItem } from '../item/speed-dial-item.js'

/**
 * @summary A button that fans out the few actions a screen is for.
 *
 * @description
 * **A menu, and deliberately not a new one.** Its rows are commands, which is
 * what `role="menu"` and `menuitem` exist for, so this takes them and takes the
 * behaviour with them: the arrow keys are `KeyboardNavigationController`, the
 * panel is `PopoverController`, and open and closed is `MixinControllerOpen`.
 * `Menu` is built from the same pieces. What is not shared is what actually
 * differs: a dial has no submenus, no headers, no checkable rows and no long
 * list to type ahead through, and shipping it as an appearance of `Menu` would
 * have meant defining what a dial with a submenu in it does.
 *
 * **The trigger is a control the consumer slots**, and the floating action
 * button is the usual one: `helix-icon-button` with `shape="circle"` and
 * `raised`. There is no `helix-fab` here, and the reason is worth stating,
 * because a component would have re-declared `appearance`, `tone`, `label` and
 * a size around a control that already has all four. A round raised button is a
 * shape, and where it sits is `data-dock` in the base layer.
 *
 * **Nothing is reserved from the keyboard.** A menu that drills has to keep the
 * horizontal pair for going in and coming back; a dial goes nowhere, so all four
 * arrows move through the actions and a reader who guesses either axis is
 * answered. That is the controller's own house position, and this is a component
 * with no reason to argue with it.
 *
 * @since 0.1.0
 * @status experimental
 * @category actions
 * @aliases FAB, Floating action button, Action button, Quick actions
 * @documentation https://helix.fusion.dev/components/speed-dial
 *
 * @slot - The actions.
 * @slot trigger - The control that opens it. Falls back to a button named by `label`.
 *
 * @csspart trigger - The default trigger, where none was slotted.
 * @csspart actions - The region the actions are drawn in.
 *
 * @event {HelixOpenEvent} helix-open - Fired before it opens, and cancelable.
 * @event {HelixCloseEvent} helix-close - Fired before it closes, and cancelable.
 */
@customElement('helix-base-speed-dial')
export class HelixBaseSpeedDial extends MixinControllerOpen(HelixElement) {
  /** Names the trigger and the set of actions it opens. */
  @property()
  label = 'Actions'

  /**
   * Which way the actions fan out. They move if that side does not fit.
   *
   * Up by default, because the control this hangs off is usually docked to the
   * bottom of the window and there is nothing below it to fan into.
   */
  @property()
  placement: Placement = 'top-end'

  /** Space between the trigger and the actions, in pixels. */
  @property({ type: Number })
  offset = 12

  /* Nothing reserved: see the note above. `selects` is false because arriving at
     Delete must not delete, which is the difference between a set of commands
     and a set of choices. */
  protected readonly keys = new KeyboardNavigationController(this, {
    items: () => this.items,
    selects: () => false,
  })

  private readonly panel = new PopoverController(this, {
    anchor: () => this.trigger,
    /* The host, so a press on the trigger is not counted as a press outside.
       `Menu` and `Megamenu` both say the same about their own. */
    boundary: () => this,
    offset: () => this.offset,
    onDismiss: () => this.close(),
    placement: () => this.placement,
    surface: () => this.renderRoot?.querySelector<HTMLElement>('[part="actions"]'),
  })

  /** Whatever the consumer slotted, or the button rendered in its place. */
  private get trigger(): HTMLElement {
    return anchorElement(
      this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]'),
      this.renderRoot?.querySelector<HTMLElement>('[part="trigger"]') ?? this,
    )
  }

  /** The actions, which are this element's own rows and nothing else slotted. */
  private get items(): HelixBaseSpeedDialItem[] {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot:not([name])')
    return (slot?.assignedElements?.() ?? []).filter(
      (one): one is HelixBaseSpeedDialItem =>
        (one as HelixBaseSpeedDialItem).isSpeedDialItem === true,
    )
  }

  /** Shuts it and puts the reader back on the trigger. */
  private close(): void {
    if (!this.requestOpen(false)) {
      return
    }
    this.trigger.focus()
  }

  private readonly handleTriggerClick = (): void => {
    this.requestOpen(!this.open)
  }

  /* Chosen, so the dial shuts behind it. An action that leaves the fan standing
     open is one a reader has to dismiss after asking for it. */
  private readonly handleSelect = (): void => {
    this.close()
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') {
      return
    }
    event.stopPropagation()
    this.close()
    event.preventDefault()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-select', this.handleSelect)
    this.addEventListener('keydown', this.handleKeydown)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleSelect)
    this.removeEventListener('keydown', this.handleKeydown)
  }

  /**
   * Tells a slotted trigger what it is doing, since it cannot know.
   *
   * The fallback button is rendered by this element and says so in its own
   * template. A trigger the consumer slotted is their markup, and the state it
   * needs to announce is state only this element holds: without this, the
   * arrangement this component recommends, an icon button slotted as the
   * trigger, is a control that opens a menu and never says it has one.
   *
   * Written onto their element rather than asked of them, because a consumer who
   * has to mirror `open` back onto their own trigger is a consumer who will
   * forget, and the failure is silent to everyone who can see the screen.
   */
  private announce(): void {
    const trigger = this.trigger
    if (trigger === this.renderRoot?.querySelector('[part="trigger"]')) {
      return
    }
    trigger.setAttribute('aria-expanded', this.open ? 'true' : 'false')
    trigger.setAttribute('aria-haspopup', 'menu')
  }

  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    this.announce()
    if (this.open) {
      this.panel.show()
      /* On the first action, which is where a reader who opened this with the
         keyboard expects to be. The pointer does not mind either way.

         Checked again on the way in, because this is a frame late and the dial
         may have shut in the meantime. Opening and pressing Escape straight
         away left focus on an action of a closed dial: the close put it back on
         the trigger, and then this, still queued from the open, took it away
         again. */
      this.updateComplete.then(() => {
        if (this.open) {
          this.items[0]?.focusItem()
        }
      })
    } else {
      this.panel.hide()
    }
  }

  protected override render(): TemplateResult {
    return html`<slot name="trigger" @click=${this.handleTriggerClick}>
        <button
          part="trigger"
          type="button"
          aria-expanded=${this.open ? 'true' : 'false'}
          aria-haspopup="menu"
          aria-label=${this.label}
        ></button>
      </slot>
      <div
        part="actions"
        popover="manual"
        role="menu"
        aria-label=${this.label || nothing}
        ?hidden=${!this.open}
      >
        <slot></slot>
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-speed-dial': HelixBaseSpeedDial
  }
}
