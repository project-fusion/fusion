import {
  anchorElement,
  customElement,
  drawIcon,
  focusTarget,
  HelixElement,
  KeyboardNavigationController,
  linkDescription,
  MixinControllerOpen,
  type NavigableItem,
  type Placement,
  PopoverController,
  slottedWords,
  tellDisclosure,
  typeaheadByWords,
  unlinkDescription,
} from '@fusion.dev/helix-core'
import { plus } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import type { HelixHeadlessSpeedDialItem } from '../item/speed-dial-item.js'
import { LongPress } from '../long-press.js'

/**
 * An action as the keyboard controller moves through it. The current one is
 * the one with focus, read as `active`, so the deprecated `selected` is read by
 * nobody but a page.
 */
const navigable = (item: HelixHeadlessSpeedDialItem): NavigableItem => ({
  contains: (node) => item.contains(node),
  disabled: item.disabled,
  focusItem: () => item.focusItem(),
  select: () => item.select(),
  selected: item.active,
  words: slottedWords(item, ['']),
})

/**
 * @summary A floating button that opens a short list of the main actions on a screen.
 *
 * @description
 * A speed dial is a menu. Its items are commands, so it uses `role="menu"` and
 * `menuitem`, and it is built from the same pieces as `Menu`:
 * - `KeyboardNavigationController` for the arrow keys
 * - `PopoverController` for the panel
 * - `MixinControllerOpen` for open and closed
 *
 * It is a separate component because a speed dial has no submenus, headers, or
 * checkable items.
 *
 * You slot the trigger. The usual floating action button is `IconButton` with
 * `shape="circle"` and `raised`. There is no `helix-fab`, because `IconButton`
 * already has `emphasis`, `tone`, `label`, and a size. Position the button with
 * `data-dock` in the base layer.
 *
 * All four arrow keys move through the actions, because a speed dial has no
 * nested levels to reserve the horizontal pair for. This is the default
 * behavior of the keyboard controller. Typing a letter moves to the next
 * action whose name starts with it. The actions are one tab stop, and Tab
 * closes the dial and moves on.
 *
 * **Keyboard.** On the trigger, Enter, Space or a press opens the dial on its
 * first action. With the dial open:
 *
 * | Key | What it does |
 * |---|---|
 * | Down, Right | Moves to the next action, from the last back to the first. |
 * | Up, Left | Moves to the action before, from the first round to the last. |
 * | Home, End | Moves to the first or the last action. |
 * | A letter | Moves to the next action whose name starts with it. |
 * | Enter, Space | Chooses the action, and the dial closes. |
 * | Escape | Closes the dial and puts focus back on the trigger. |
 * | Tab | Closes the dial and moves on. |
 *
 * **Groups.** Put actions in `Speed Dial.Group`, named by its `label`, to set
 * them apart as Menu's sections do: each is a `group` of the menu, and the
 * arrow keys walk through every group's actions in order.
 *
 * **A trigger with its own action.** With `open-on="long-press"`, a press on
 * the trigger is the trigger's own, such as composing a message, and holding it
 * for half a second opens the dial, as React Aria's menu trigger does with
 * `trigger="longPress"`. Alt+Down or Alt+Up opens it from the keyboard, and
 * the trigger says so in its description, `long-press-label`, the drawn one
 * and a slotted one alike. A press that has opened the dial does not also do
 * the trigger's action.
 *
 * @since 0.1.0
 * @status stable
 * @category actions
 * @aliases FAB, Floating action button, Action button, Quick actions
 * @documentation https://fusion.dev/helix/components/speed-dial
 *
 * @slot - The actions.
 * @slot trigger - The control that opens the actions. Without one, a button named by `label` is drawn.
 *
 * @event {HelixBeforeCloseEvent} helix-before-close - The actions are about to close. Cancelable: cancel it to keep them open.
 * @event {HelixBeforeOpenEvent} helix-before-open - The actions are about to open. Cancelable: cancel it to keep them closed.
 * @event {HelixSelectEvent} helix-select - An action was chosen. The action sends the event, and the dial closes after it. Cancelable: cancel it to keep the dial open.
 * @event {ToggleEvent} toggle - The dial opened or closed. The event carries `newState` and `oldState`.
 *
 * @csspart actions - The region the actions are drawn in.
 * @csspart trigger - The default trigger, drawn when none is slotted.
 *
 * @cssstate open - While the actions are out.
 */
@customElement('helix-headless-speed-dial')
export class HelixHeadlessSpeedDial extends MixinControllerOpen(HelixElement) {
  /**
   * Accessible name for the trigger and the set of actions it opens.
   */
  @property()
  label = 'Actions'

  /**
   * The description the trigger gives under `open-on="long-press"`, saying how
   * its actions are reached.
   *
   * A slotted trigger is described by the dial, which carries the words as
   * its own label for that: a Helix button's inner control at once, and a
   * plain element of yours once a reader reaches it, after hydration, unless
   * you described or labeled it yourself.
   */
  @property({ attribute: 'long-press-label' })
  longPressLabel = 'Long press or press Alt+Down to show the actions'

  /**
   * Space between the trigger and the actions, in pixels.
   */
  @property({ type: Number })
  offset = 12

  /**
   * What opens the dial. `click` opens it on a press of the trigger. Under
   * `long-press`, a press is the trigger's own action, and the dial opens on a
   * press held for half a second, or on Alt+Down or Alt+Up.
   */
  @property({ attribute: 'open-on' })
  openOn: 'click' | 'long-press' = 'click'

  /**
   * The direction the actions open in. They move to another side if that side
   * does not fit.
   *
   * Up by default, because the control this hangs off is usually docked to the
   * bottom of the window and there is nothing below it to fan into.
   */
  @property()
  placement: Placement = 'top-end'

  /* Nothing reserved: see the note above. `selects` is false because arriving at
     Delete must not delete, which is the difference between a set of commands
     and a set of choices. */
  protected readonly keys = new KeyboardNavigationController(this, {
    // None while closed, when the actions are hidden and cannot take focus.
    items: () => (this.open ? this.items.map(navigable) : []),
    selects: () => false,
    typeahead: typeaheadByWords(),
  })

  /**
   * Whether the trigger asked for the open that is under way, which is the one
   * open that moves focus onto the first action.
   *
   * A dial opened by `default-open` or by a script setting `open` leaves focus
   * where it is: on load that is wherever `autofocus` put it, and later it is
   * wherever the reader is typing.
   */
  private focusOnOpen = false

  /* Registered rather than held, the way `ToggleGroup` holds its keys: the
     controller follows `open` on its own, so nothing here talks to it after
     construction, and a private field nothing reads is an unused one. */
  protected readonly panel = new PopoverController(this, {
    anchor: () => this.trigger,
    /* The host, so a press on the trigger is not counted as a press outside.
       `Menu` and `Megamenu` both say the same about their own. */
    boundary: () => this,
    offset: () => this.offset,
    onDismiss: () => this.close(),
    open: () => this.open,
    placement: () => this.placement,
    surface: () => this.partNamed('actions'),
  })

  /** Whatever the consumer slotted, or the button rendered in its place. */
  private get trigger(): HTMLElement {
    return anchorElement(
      this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]'),
      this.partNamed('trigger') ?? this,
    )
  }

  /**
   * The actions, in order: this element's own rows, and the rows of each group
   * slotted beside them, and nothing else slotted.
   */
  private get items(): HelixHeadlessSpeedDialItem[] {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot:not([name])')
    const isItem = (one: Element): one is HelixHeadlessSpeedDialItem =>
      (one as HelixHeadlessSpeedDialItem).isSpeedDialItem === true
    return (slot?.assignedElements?.() ?? []).flatMap((one) =>
      isItem(one)
        ? [one]
        : (one as Element & { isSpeedDialGroup?: boolean }).isSpeedDialGroup === true
          ? [...one.children].filter(isItem)
          : [],
    )
  }

  /** Watches the trigger for a held press, under `open-on="long-press"`. */
  private readonly longPress = new LongPress(this, {
    onLongPress: () => {
      if (!this.open) {
        this.focusOnOpen = this.requestOpen(true)
      }
    },
  })

  private get pressHeld(): boolean {
    return this.openOn === 'long-press'
  }

  /**
   * Puts focus on the trigger, the slotted one or the button drawn in its
   * place, as a `focus()` on a native control would. The host itself takes no
   * focus, so a page focusing it after a dialog closes landed nowhere.
   */
  override focus(options?: FocusOptions): void {
    const trigger = this.trigger
    if (trigger === this) {
      super.focus(options)
      return
    }
    trigger.focus(options)
  }

  /** Shuts it and puts the reader back on the trigger. */
  private close(): void {
    if (!this.requestOpen(false)) {
      return
    }
    this.focus()
  }

  private readonly handleTriggerClick = (): void => {
    if (this.open) {
      this.requestOpen(false)
      return
    }
    /* Under a long press, a click is the trigger's own action. */
    if (this.pressHeld) {
      return
    }
    this.focusOnOpen = this.requestOpen(true)
  }

  /**
   * Takes the click a held press ends in, ahead of the trigger's own
   * listeners, so a press that opened the dial does not also do the trigger's
   * action. In capture, on the host, which is above a slotted trigger.
   */
  private readonly handleHeldClick = (event: MouseEvent): void => {
    if (this.pressHeld && this.longPress.takeClick()) {
      event.stopImmediatePropagation()
      event.preventDefault()
    }
  }

  private readonly handleTriggerPointerDown = (event: PointerEvent): void => {
    if (this.pressHeld && !this.open) {
      this.longPress.down(event)
    }
  }

  private readonly handleTriggerPointerMove = (event: PointerEvent): void => {
    this.longPress.move(event)
  }

  private readonly handleTriggerPointerUp = (): void => {
    this.longPress.up()
  }

  private readonly handleTriggerPointerCancel = (): void => {
    this.longPress.cancel()
  }

  /* A touch held on the trigger is also the browser's own menu, which would
     cover the actions as they open. */
  private readonly handleTriggerContextMenu = (event: Event): void => {
    if (this.pressHeld) {
      event.preventDefault()
    }
  }

  /* Chosen, so the dial shuts behind it. An action that leaves the fan standing
     open is one a reader has to dismiss after asking for it.

     **Once the choice has been heard, and only if it stood**, for `Menu`'s
     reason: registered at connection, this listener ran before the page's own,
     so the dial closed before anybody could refuse a choice documented as
     cancelable. */
  private readonly handleSelect = (event: Event): void => {
    queueMicrotask(() => {
      if (!event.defaultPrevented) {
        this.close()
      }
    })
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    /* Closed, a key is not this element's, so Escape reaches a dialog around
       the dial, except the one a long-press trigger opens with: Alt with Down
       or Up, as React Aria's menu trigger takes it. */
    if (!this.open) {
      if (
        this.pressHeld &&
        event.altKey &&
        (event.key === 'ArrowDown' || event.key === 'ArrowUp')
      ) {
        event.preventDefault()
        this.focusOnOpen = this.requestOpen(true)
      }
      return
    }
    if (event.key === 'Tab') {
      /* Out, and the dial goes with it, as `Menu` does. Focus carries on to
         where the reader tabbed, so it is not put back on the trigger. */
      this.requestOpen(false)
      return
    }
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
    this.addEventListener('click', this.handleHeldClick, true)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    if (this.described) {
      unlinkDescription(this.described, this)
      this.described = undefined
      this.internals.ariaLabel = null
    }
    this.removeEventListener('helix-select', this.handleSelect)
    this.removeEventListener('keydown', this.handleKeydown)
    this.removeEventListener('click', this.handleHeldClick, true)
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
    if (trigger === this.partNamed('trigger')) {
      return
    }
    tellDisclosure(trigger, this.open, 'menu')
  }

  /** The control the dial has described, so the description can be taken back. */
  private described: Element | undefined

  /**
   * Describes a slotted trigger by `long-press-label` under
   * `open-on="long-press"`, as the drawn one is, or takes it back.
   *
   * **By the host, which carries the words as its label.** The drawn
   * trigger's description is in this shadow root, and a reference from the
   * consumer's trigger, or from the button inside a Helix one, cannot point
   * in; it can point out, to the host. Core's `linkDescription` says where
   * that is safe: inside a component's shadow root always, and on the
   * consumer's own element only once `light` says a reader has acted, which
   * is after hydration. React Aria's long press describes whatever trigger it
   * is given.
   *
   * @param light A reader has just reached the trigger.
   */
  private describeTrigger(light = false): void {
    const trigger = this.trigger
    const slotted = this.pressHeld && trigger !== this && trigger !== this.partNamed('trigger')
    const control = slotted ? focusTarget(trigger) : undefined
    if (this.described && this.described !== control) {
      unlinkDescription(this.described, this)
      this.described = undefined
    }
    if (control && control !== this.described && linkDescription(control, this, light)) {
      this.described = control
    }
    this.internals.ariaLabel = this.described ? this.longPressLabel : null
  }

  /** A reader reaching a slotted trigger, which is late enough to describe a plain one. */
  private readonly handleTriggerFocusIn = (): void => {
    if (this.pressHeld) {
      this.describeTrigger(true)
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    /* A Helix trigger draws its control after this first look, so the dial
       looks again a frame later, as Badge does. */
    requestAnimationFrame(() => this.describeTrigger())
  }

  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    this.announce()
    this.describeTrigger()
    if (this.open && this.focusOnOpen) {
      this.focusOnOpen = false
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
    }
  }

  /**
   * The control that opens it, behind a seam the styled tier can move.
   *
   * **This is the case the tier rule blocks and a render method unblocks.** A
   * bare `<button>` is what the headless tier can write: it must not reach for
   * `Button`, which lives a tier above and would make `headless` depend on
   * `styled`. So the base draws the plain control and a tier that has buttons
   * of its own overrides this to use one. Written inline, the only way to
   * change it would be to reimplement the template, panel and all.
   */
  protected renderTrigger(): TemplateResult {
    const held = this.pressHeld
    return html`<slot
      name="trigger"
      @click=${this.handleTriggerClick}
      @contextmenu=${this.handleTriggerContextMenu}
      @focusin=${this.handleTriggerFocusIn}
      @pointercancel=${this.handleTriggerPointerCancel}
      @pointerdown=${this.handleTriggerPointerDown}
      @pointermove=${this.handleTriggerPointerMove}
      @pointerup=${this.handleTriggerPointerUp}
      @slotchange=${() => this.describeTrigger()}
    >
      <button
        part="trigger"
        type="button"
        aria-describedby=${held ? 'long-press' : nothing}
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
      ${held ? html`<span id="long-press" hidden>${this.longPressLabel}</span>` : nothing}
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
