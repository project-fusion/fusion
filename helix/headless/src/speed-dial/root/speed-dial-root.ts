import {
  anchorElement,
  customElement,
  drawIcon,
  HelixElement,
  KeyboardNavigationController,
  MixinControllerOpen,
  type Placement,
  PopoverController,
  tellDisclosure,
} from '@fusion.dev/helix-core'
import { plus } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import type { HelixHeadlessSpeedDialItem } from '../item/speed-dial-item.js'

/**
 * @summary A button that fans out the few actions a screen is for.
 *
 * @description
 * **A menu, and deliberately not a new one.** Its rows are commands, which is
 * what `role="menu"` and `menuitem` exist for, so this takes them and takes the
 * behavior with them: the arrow keys are `KeyboardNavigationController`, the
 * panel is `PopoverController`, and open and closed is `MixinControllerOpen`.
 * `Menu` is built from the same pieces. What is not shared is what actually
 * differs: a dial has no submenus, no headers, no checkable rows and no long
 * list to type ahead through, and shipping it as an appearance of `Menu` would
 * mean defining what a dial with a submenu in it does.
 *
 * **The trigger is a control the consumer slots**, and the floating action
 * button is the usual one: `helix-icon-button` with `shape="circle"` and
 * `raised`. There is no `helix-fab`, because it would re-declare `emphasis`,
 * `tone`, `label` and a size around a control that already has all four. A
 * round raised button is a shape, and where it sits is `data-dock` in the base
 * layer.
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
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before it closes, and cancelable.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before it opens, and cancelable.
 * @event {Event} toggle - Says the state moved, carrying `newState` and `oldState`.
 *
 * @csspart actions - The region the actions are drawn in.
 * @csspart trigger - The default trigger, where none was slotted.
 */
@customElement('helix-headless-speed-dial')
export class HelixHeadlessSpeedDial extends MixinControllerOpen(HelixElement) {
  /**
   * Names the trigger and the set of actions it opens.
   */
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

  /**
   * Space between the trigger and the actions, in pixels.
   */
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
  private get items(): HelixHeadlessSpeedDialItem[] {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot:not([name])')
    return (slot?.assignedElements?.() ?? []).filter(
      (one): one is HelixHeadlessSpeedDialItem =>
        (one as HelixHeadlessSpeedDialItem).isSpeedDialItem === true,
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
   * trigger, is a control that opens a menu and never says it has one. A
   * consumer who has to mirror `open` back onto their own trigger is a consumer
   * who will forget, and the failure is silent to everyone who can see the
   * screen.
   *
   * **Never `setAttribute`.** Writing `aria-expanded` onto the consumer's
   * element is a hydration mismatch React reports and does not patch up,
   * measured against React 19.2.8. `tellDisclosure` carries the argument and the
   * measurement: the state travels as a property, into the trigger's own shadow
   * root, where React neither looks nor compares.
   *
   * `aria-haspopup` goes with it rather than being written separately. An
   * attribute the consumer's server never sent is a mismatch whether or not it
   * moves afterwards, measured in both load orders, and a trigger that says it
   * is expanded is already saying it has something to expand.
   */
  private announce(): void {
    const trigger = this.trigger
    if (trigger === this.renderRoot?.querySelector('[part="trigger"]')) {
      return
    }
    tellDisclosure(trigger, this.open)
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
          /* The first action that can *take* focus, not the first action. A
             dial whose first item is disabled otherwise opens onto a row that
             refuses focus, so the reader lands nowhere and their first arrow
             key starts from nothing. `KeyboardNavigationController` filters
             disabled items itself; this is the one place that reaches past it
             and indexes the list. */
          this.items.find((one) => !one.disabled)?.focusItem()
        }
      })
    } else {
      this.panel.hide()
    }
  }

  /**
   * The control that opens it, behind a seam the styled tier can move.
   *
   * **This is the case the tier rule blocks and a render method unblocks.** A
   * bare `<button>` is what the headless tier can write: it must not reach for
   * `helix-button`, which lives a tier above and would make `headless` depend
   * on `styled`. So the base draws the plain control and a tier that has buttons
   * of its own overrides this to use one. Written inline, the only way
   * to change it would be to reimplement the template, panel and all.
   */
  protected renderTrigger(): TemplateResult {
    return html`<slot name="trigger" @click=${this.handleTriggerClick}>
      <button
        part="trigger"
        type="button"
        aria-expanded=${this.open ? 'true' : 'false'}
        aria-haspopup="menu"
        aria-label=${this.label}
      >
        ${
          /* A glyph, so a consumer who slots no trigger does not get an empty
             control for a button whose whole job is to be found. `plus` is what
             a speed dial opens with everywhere it exists. */
          ''
        }
        ${drawIcon(plus)}
      </button>
    </slot>`
  }

  protected override render(): TemplateResult {
    return html`${this.renderTrigger()}
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
    'helix-headless-speed-dial': HelixHeadlessSpeedDial
  }
}
