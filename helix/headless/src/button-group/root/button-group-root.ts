import {
  auditName,
  commaList,
  customElement,
  HelixElement,
  hostAria,
  inlineStep,
  pressedValue,
  reportRuntime,
  requestValue,
  rovingStop,
  toolbarAround,
  whenHydrated,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { arrowTarget } from '../arrows.js'

/**
 * A button the group can press and move focus to: a Helix button, which owns
 * its tab stop through `focusable` and keeps its control inside its own shadow
 * root.
 */
type GroupButton = HTMLElement & {
  disabled?: boolean
  focusable: boolean
  updateComplete: Promise<unknown>
  value: string
}

/**
 * Whether a child is a Helix button. A property test, since the child may be
 * any of the button families, and an element that has not upgraded has
 * neither property yet.
 */
const isGroupButton = (child: Element): child is GroupButton =>
  child instanceof HTMLElement && 'focusable' in child && 'value' in child

/**
 * @summary Groups related buttons into one control.
 *
 * @description
 * Sets `role="group"` on the host through internals, and `label` names the
 * group. Without a name, a screen reader announces the buttons as separate
 * controls, and a development build warns once with the kind `missing-name`.
 *
 * The group does not manage focus, so each button keeps its own tab stop. For
 * one tab stop with arrow keys between a mix of controls, the APG toolbar
 * pattern, use Toolbar.
 *
 * Buttons are slotted, so they stay your own elements and keep their own
 * appearance and size.
 *
 * **Buttons that stay pressed.** With `selection-mode`, each button with a
 * `value` is a toggle button: a press presses or releases it, and it says so
 * with `aria-pressed`. `single` keeps one pressed at a time, and a press on the
 * pressed one releases it. `multiple` lets any number be pressed. `value` is
 * the pressed values, comma separated. A press sends a cancelable
 * `helix-before-change` with the value it would leave, then `change`.
 *
 * The pressed state is written on the control inside each button's shadow
 * root, so the markup you rendered is never changed and a framework hydrating
 * it sees what its server sent. That is also why only Helix buttons are
 * toggles: a native `<button>` or a button without a `value` stays a plain
 * action button in the group, and a native one without its own
 * `aria-pressed` warns once, with the runtime kind `untold-toggle`. The inner
 * control also carries
 * `--button-group-pressed`, `1` or `0`, for a `::part(button)` rule of yours.
 *
 * Use Toggle Group instead for a choice that belongs in a form, or one where
 * the arrow keys choose as they move: it is a `radiogroup` of options with a
 * form value, `required` and validation. A Button Group in a selection mode is
 * a set of actions that stay on, such as bold and italic, or a view that a
 * press switches, and it submits nothing.
 *
 * **Keyboard.** In a selection mode the group is one tab stop: the button
 * focus was last on, then the first pressed one, then the first one.
 *
 * | Key | What it does |
 * |---|---|
 * | Right, Down | Moves to the next button, from the last back to the first. |
 * | Left, Up | Moves to the button before, from the first round to the last. |
 * | Home, End | Moves to the first or the last button. |
 * | Space, Enter | Presses or releases the focused button. |
 *
 * Left and Right swap on a right-to-left page, and a disabled button is
 * passed over. In a selection mode the group is a `toolbar`, with
 * `aria-orientation` under `orientation="vertical"`. Inside a toolbar it stays
 * a named `group`, and the toolbar's own arrow keys walk its buttons, so a
 * reader meets one toolbar.
 *
 * @since 0.1.0
 * @status stable
 * @category actions
 * @aliases Segmented buttons, Split button, Toggle buttons
 * @documentation https://fusion.dev/helix/components/button-group
 *
 * @slot - The buttons in the group.
 *
 * @event {Event} change - Fired after a press changes `value`, in a selection mode.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before a press changes `value`, with the value it would leave in `detail.value`. Cancelable: call `preventDefault()` to keep the buttons as they are.
 *
 * @cssproperty --button-group-pressed - Written on the control inside each toggle button of a group with `selection-mode`: `1` while it is pressed and `0` while it is not. Read it in a `::part(button)` rule to draw the pressed look.
 */
@customElement('helix-headless-button-group')
export class HelixHeadlessButtonGroup extends HelixElement {
  /**
   * The group's name, read by screen readers.
   *
   * On the host through internals, so an author's `aria-label` still overrides
   * it and nothing lands on the host that a consumer's markup did not have.
   */
  @property()
  label = ''

  /**
   * Which way the buttons are stacked.
   *
   * Unset is a row and stays unset, so a reflected default cannot appear on a
   * host whose server output never had it.
   *
   * **A property and not an `auto`, which the splitter and the carousel earned
   * and this has not.** Turning those two changes what they *do*: a drag axis,
   * arrow keys, how many slides a page holds. A group of buttons turning is
   * paint, so there is no state to resolve and nothing to observe; what it needs
   * is for a consumer who knows the column is narrow to be able to say so.
   *
   * **What it is for, measured.** Three buttons at 320 come to 322 and overflow
   * the page by 26. A row of joined buttons cannot answer that by wrapping,
   * which is the obvious reach and the wrong one: the group's whole contract is
   * buttons sharing edges as one shape, and a wrapped row carries the corners of
   * a first row into a second. Stacked, the same three keep one shape and one
   * column.
   */
  @property({ reflect: true })
  orientation?: 'horizontal' | 'vertical'

  /**
   * Whether the buttons stay pressed: `single` keeps one pressed at a time and
   * `multiple` any number. Unset, they are action buttons, each its own tab
   * stop, as before.
   *
   * Optional, so the attribute is absent until a consumer writes it.
   */
  @property({ attribute: 'selection-mode', reflect: true })
  selectionMode?: 'multiple' | 'single'

  /**
   * The values of the pressed buttons, comma separated, in a selection mode.
   * A button's own `value` names it, so a value holds no comma.
   *
   * The attribute is the seed, and a press changes the property, which does
   * not reflect, as a native control's `value` does not.
   */
  @property()
  value = ''

  /**
   * The Helix buttons of a group in a selection mode, in the order they are
   * written, and none otherwise. Empty on a server, which has no tree.
   */
  private get buttons(): GroupButton[] {
    return this.selectionMode && this.children ? [...this.children].filter(isGroupButton) : []
  }

  /**
   * Whether the group holds the tab stop and the arrow keys: in a selection
   * mode, and not inside a toolbar, whose own keys walk the buttons.
   *
   * Truthiness, as `buttons` reads it: a removed attribute leaves the property
   * null, which is no selection mode.
   */
  private get roving(): boolean {
    return Boolean(this.selectionMode) && toolbarAround(this) === null
  }

  /** Whether a button is pressed: its value is among the group's. */
  private pressed(button: GroupButton): boolean {
    return button.value !== '' && commaList(this.value).includes(button.value)
  }

  /** The button focus was last on, which holds the tab stop. */
  private lastFocused: GroupButton | undefined = undefined

  /**
   * The buttons this group has told something, each with whether it moved
   * their tab stop, so a button that leaves the group, or a group that leaves
   * its selection mode, is put back as it was.
   */
  private readonly told = new Map<GroupButton, boolean>()

  private watcher: MutationObserver | undefined

  /**
   * Tells every button whether it is pressed and whether it holds the stop,
   * and puts back the ones that left.
   */
  private sync(): void {
    const buttons = this.buttons
    const roving = this.roving
    const stop = roving
      ? rovingStop(buttons, this.lastFocused, {
          disabled: (button) => button.disabled === true,
          selected: (button) => this.pressed(button),
        })
      : undefined
    for (const [button, roved] of this.told) {
      if (!buttons.includes(button)) {
        this.told.delete(button)
        this.mark(button)
        if (roved) {
          whenHydrated(button, () => {
            button.focusable = true
          })
        }
      }
    }
    for (const button of buttons) {
      this.told.set(button, roving)
      this.mark(button)
      if (roving) {
        whenHydrated(button, () => {
          button.focusable = button === stop
        })
      }
    }
    /* A button whose definition has not loaded is no button yet, so it is
       read again once it is. A native one is told it cannot be a toggle. */
    for (const child of this.selectionMode && this.children ? this.children : []) {
      if (child.localName.includes('-') && !isGroupButton(child)) {
        void customElements.whenDefined(child.localName).then(() => this.sync())
      } else if (child.localName === 'button' && !child.hasAttribute('aria-pressed')) {
        this.warn(child)
      }
    }
  }

  /** Whether this group has said a native button in it cannot be a toggle, so it says so once. */
  private warned = false

  /**
   * Says once that a native `<button>` in a selection mode stays an action
   * button, since its pressed state would be an attribute on the page's markup.
   * One with its own `aria-pressed` is the page's to say, and is not reported.
   */
  private warn(button: Element): void {
    if (this.warned) {
      return
    }
    this.warned = true
    reportRuntime({
      kind: 'untold-toggle',
      message:
        `<${this.localName}> cannot press a native <button>: its state would be written onto your ` +
        'markup. Slot a Helix button with a `value`, or set `aria-pressed` on the button yourself.',
      tag: button.localName,
    })
  }

  /**
   * Writes a button's pressed state onto its control, once the button has
   * rendered it, and takes it off a button the group no longer holds.
   *
   * **On the control inside the button's shadow root, never on the button.**
   * An attribute written on the consumer's element is a hydration mismatch a
   * React consumer's hydration reports and does not patch up, which is why
   * `tellDisclosure` hands a trigger `expanded` as a property. Inside the
   * button's own shadow root no framework compares the attribute, and the
   * reader is on that control. Read at the moment of the write, so the last
   * press wins whatever order renders finish in.
   *
   * The control is the `<button>` a Helix button renders, which is where its
   * `delegatesFocus` sends focus and what a reader is on.
   *
   * A button that carries `aria-pressed` itself is the consumer's to say, and
   * its own forwarding carries that down instead.
   */
  private mark(button: GroupButton): void {
    void button.updateComplete.then(() => {
      const control = button.shadowRoot?.querySelector('button')
      if (control && !button.hasAttribute('aria-pressed')) {
        const toggle = this.told.has(button) && button.value !== ''
        this.markPressed(control, toggle ? this.pressed(button) : undefined)
      }
    })
  }

  /**
   * Says on a button's control whether it is pressed, or that it is no toggle
   * at all where `pressed` is undefined. A styled tier draws the look here.
   *
   * @param control The focusable control inside the button's shadow root.
   * @param pressed Whether the button is pressed, or undefined where it is not a toggle.
   */
  protected markPressed(control: HTMLElement, pressed: boolean | undefined): void {
    if (pressed === undefined) {
      control.removeAttribute('aria-pressed')
    } else {
      control.setAttribute('aria-pressed', String(pressed))
    }
    control.style.setProperty(
      '--button-group-pressed',
      pressed === undefined ? '' : pressed ? '1' : '0',
    )
  }

  /**
   * Presses or releases the button a press acted on. `helix-press` rather than
   * `click`, since a button sends it only for a press that acted: never while
   * it is disabled or pending.
   */
  private readonly handlePress = (event: Event): void => {
    const mode = this.selectionMode
    const button = this.buttons.find((one) => event.composedPath().includes(one))
    if (mode && button && button.value !== '') {
      requestValue(this, pressedValue(mode, this.value, button.value), (next) => {
        this.value = next
      })
    }
  }

  /**
   * Moves focus between the buttons without pressing them, a toolbar's
   * reading: a press is its own act, on Space or Enter, which the button
   * answers natively. Both axes, as every set here answers both, and the
   * horizontal pair turns on a right-to-left page.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const buttons = this.roving ? this.buttons.filter((one) => one.disabled !== true) : []
    const from = buttons.findIndex((one) => event.composedPath().includes(one))
    const to = arrowTarget(event.key, inlineStep(this, event.key), from, buttons.length)
    if (to >= 0 && !event.defaultPrevented) {
      event.preventDefault()
      buttons[to]?.focus()
    }
  }

  /** Moves the tab stop to the button focus arrived on. */
  private readonly noteFocus = (event: FocusEvent): void => {
    const button = this.buttons.find((one) => event.composedPath().includes(one))
    if (button && button !== this.lastFocused) {
      this.lastFocused = button
      this.sync()
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('focusin', this.noteFocus)
    this.addEventListener('helix-press', this.handlePress)
    this.addEventListener('keydown', this.handleKeydown)
    /* Buttons arriving or leaving, and a `disabled` or `value` changing, which
       move the stop and the pressed set. Nothing here writes an attribute in
       this tree, so the observer cannot feed itself. */
    this.watcher = new MutationObserver(() => this.sync())
    this.watcher.observe(this, {
      attributeFilter: ['disabled', 'value'],
      childList: true,
      subtree: true,
    })
    /* Moved into or out of a toolbar, so the role is read again. */
    this.requestUpdate()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('focusin', this.noteFocus)
    this.removeEventListener('helix-press', this.handlePress)
    this.removeEventListener('keydown', this.handleKeydown)
    this.watcher?.disconnect()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* A toolbar in a selection mode, as React Aria's ToggleButtonGroup is, and
       a group of the toolbar around it otherwise, since a toolbar inside a
       toolbar is a reader's dead end. */
    const toolbar = this.roving
    hostAria(this.internals, { label: this.label, role: toolbar ? 'toolbar' : 'group' })
    this.internals.ariaOrientation = toolbar ? (this.orientation ?? null) : null
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    /* A group with no name reads as its buttons one by one, with nothing
       saying they belong together. Development builds only. */
    auditName(
      this,
      () => null,
      'Give it a `label`, or an `aria-label` that says what the buttons are for.',
      () => this.label !== '',
    )
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.sync()
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-button-group': HelixHeadlessButtonGroup
  }
}
