import {
  customElement,
  deepActiveElement,
  HelixElement,
  HelixSelectEvent,
} from '@fusion.dev/helix-core'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

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
 * @since 0.1.0
 * @status stable
 * @category actions
 * @aliases Speed dial action, FAB action, Quick action
 * @documentation https://fusion.dev/helix/components/speed-dial
 *
 * @slot - The action's name.
 * @slot icon - The action's icon, the main way the action is recognized.
 *
 * @event {HelixSelectEvent} helix-select - The action was chosen. Cancelable: cancel it to keep the dial open.
 *
 * @csspart icon - The box that holds the icon.
 * @csspart item - The control for the action.
 * @csspart label - The action's name, beside the icon.
 */
@customElement('helix-headless-speed-dial-item')
export class HelixHeadlessSpeedDialItem extends HelixElement {
  /**
   * Whether the action is disabled, so it cannot be chosen.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

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
    return this.active
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
    return html`<button
      part="item"
      role="menuitem"
      type="button"
      aria-disabled=${this.disabled ? 'true' : nothing}
      ?disabled=${this.disabled}
      tabindex="-1"
      @click=${this.handleClick}
    >
      <span part="icon"><slot name="icon"></slot></span>
      <span part="label"><slot></slot></span>
    </button>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-speed-dial-item': HelixHeadlessSpeedDialItem
  }
}
