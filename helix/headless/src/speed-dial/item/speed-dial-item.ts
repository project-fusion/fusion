import {
  ariaChord,
  chordParts,
  customElement,
  deepActiveElement,
  HelixElement,
  HelixSelectEvent,
  keyNames,
  onApple,
  reportRuntime,
  slotFilled,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/** Whether a page has been told that `selected` is deprecated, which it is once. */
let toldSelected = false

/**
 * @summary One action in a speed dial: an icon and a name beside it.
 *
 * @description
 * Each item is a command, so it has the `menuitem` role. A megamenu holds
 * destinations, so it is a disclosure of links. A speed dial holds actions,
 * which is what `role="menu"` is for.
 *
 * The name is text rendered beside the icon, and it is the accessible name. A
 * `title` on an icon shows only on hover. Visible text is read, searched, and
 * translated like other text.
 *
 * `shortcut` gives the action's keyboard shortcut as a chord, such as `mod+s`,
 * the grammar Menu's rows use. The action carries it as `aria-keyshortcuts`
 * and draws it after the name in the platform's glyphs or words, `⌘S` on an
 * Apple keyboard and `Ctrl+S` elsewhere, as Menu draws its rows' shortcuts.
 * Put a `Kbd` in the `shortcut` slot to draw it as keys instead; the dial
 * imports no `Kbd` of its own. Showing a shortcut does not bind it.
 *
 * @since 0.1.0
 * @status stable
 * @category actions
 * @aliases Speed dial action, FAB action, Quick action
 * @documentation https://fusion.dev/helix/components/speed-dial
 *
 * @slot - The action's name.
 * @slot icon - The action's icon, the main way the action is recognized.
 * @slot shortcut - The action's keyboard shortcut, drawn after its name, such as a `Kbd`. It replaces the text drawn for `shortcut`, and is hidden from the name, which `aria-keyshortcuts` carries instead.
 *
 * @event {HelixSelectEvent} helix-select - The action was chosen. Cancelable: cancel it to keep the dial open.
 *
 * @csspart icon - The box that holds the icon.
 * @csspart item - The control for the action.
 * @csspart label - The action's name, beside the icon.
 * @csspart shortcut - The box after the name that holds the shortcut, shown while `shortcut` is set or something is in the `shortcut` slot.
 */
@customElement('helix-headless-speed-dial-item')
export class HelixHeadlessSpeedDialItem extends HelixElement {
  /**
   * Whether the action is disabled, so it cannot be chosen.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * The action's keyboard shortcut as a chord, such as `mod+s`, carried as
   * `aria-keyshortcuts` and drawn after the name. `mod` is Command on an Apple
   * keyboard and Control elsewhere. Showing a shortcut does not bind it.
   */
  @property()
  shortcut = ''

  /**
   * The action's value, sent in `helix-select` when the action is chosen.
   */
  @property()
  value = ''

  /**
   * @internal Read by a parent to identify its children across the light DOM,
   * which is cheaper than `instanceof` and is why this is public rather than
   * protected. Not a consumer's to read or set.
   */
  readonly isSpeedDialItem = true

  /** Puts focus on the control inside the item. */
  override focus(options?: FocusOptions): void {
    this.partNamed('item')?.focus(options)
  }

  /**
   * Moves focus to the action. Part of `NavigableItem`, which the shared
   * keyboard controller uses for the arrow keys.
   */
  focusItem(): void {
    this.focus()
  }

  /** Chooses the action, the same as pressing it. */
  select(): void {
    this.choose()
  }

  /**
   * Whether the action has focus, which makes it the action the keyboard is on.
   *
   * `Option` calls the same thing `active`. The focused node is found through
   * every shadow root, as `Menu.Item` does, so a dial inside another
   * component's shadow root still knows its current action.
   */
  get active(): boolean {
    const active = deepActiveElement()
    return active !== null && active.getRootNode() === this.renderRoot
  }

  /**
   * Whether the action has focus, the same as `active`.
   *
   * @deprecated Read `active`. Everywhere else in the library `selected` means
   * chosen out of a set, and a speed dial's action is never chosen that way.
   */
  get selected(): boolean {
    if (!toldSelected) {
      toldSelected = true
      reportRuntime({
        kind: 'deprecated',
        message: `<${this.localName}>.selected is deprecated: read \`active\`, which says the same.`,
        tag: this.localName,
      })
    }
    return this.active
  }

  /** Whether anything is in the `shortcut` slot, so its box is drawn. */
  @state()
  private hasShortcut = false

  private readonly readShortcut = (): void => {
    this.hasShortcut = slotFilled(
      this.renderRoot.querySelector<HTMLSlotElement>('slot[name="shortcut"]'),
    )
  }

  private choose(): void {
    if (this.disabled) {
      return
    }
    this.dispatchEvent(new HelixSelectEvent({ value: this.value }))
  }

  private readonly handleClick = (): void => {
    this.choose()
  }

  protected override render(): TemplateResult {
    /* In this reader's platform's words, and in the server's while hydrating
       what one sent, which has no keyboard to ask. */
    const keys =
      this.shortcut === '' ? nothing : ariaChord(this.shortcut, !this.hydrating && onApple())
    return html`<button
      part="item"
      role="menuitem"
      type="button"
      aria-disabled=${this.disabled ? 'true' : nothing}
      aria-keyshortcuts=${keys}
      ?disabled=${this.disabled}
      tabindex="-1"
      @click=${this.handleClick}
    >
      <span part="icon"><slot name="icon"></slot></span>
      <span part="label"><slot></slot><span
          part="shortcut"
          aria-hidden="true"
          ?hidden=${!this.hasShortcut && this.shortcut === ''}
        >${this.renderShortcut()}</span
      ></span>
    </button>`
  }

  /**
   * The `shortcut` slot, holding the shortcut drawn after the name as Kbd
   * draws a chord and from the same table: the slot's fallback, so a `Kbd`
   * slotted in replaces it.
   */
  protected renderShortcut(): TemplateResult {
    const drawn = keyNames(chordParts(this.shortcut), !this.hydrating && onApple())
    return html`<slot name="shortcut" @slotchange=${this.readShortcut}>${drawn.keys.join(drawn.separator)}</slot>`
  }

  /* The server had no keyboard to name, so a shortcut is said again in this
     reader's words once hydration is over. */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    /* A key slotted before the first render is assigned without a
       `slotchange` everywhere, so it is read once here as well. */
    this.readShortcut()
    if (this.shortcut !== '') {
      this.finishHydration()
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-speed-dial-item': HelixHeadlessSpeedDialItem
  }
}
