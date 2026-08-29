import { customElement, HelixElement, HelixSelectEvent } from '@fusion.dev/helix-core'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One action in a speed dial: a mark, and a name beside it.
 *
 * @description
 * **A command, which is why this is a `menuitem` and a megamenu's rows are not.**
 * The distinction is what the thing does, not what it looks like: a megamenu
 * holds destinations, so it is a disclosure of links, and this holds actions a
 * screen can take, which is exactly what `role="menu"` was written for. The
 * roles follow the contents.
 *
 * **The name is text, not a title.** A dial's actions are icons, and an icon
 * with a `title` is an action whose name only exists for whoever hovers it long
 * enough. The label is rendered beside the mark and is the accessible name by
 * being there, so it is read, searched and translated like anything else.
 *
 * @since 0.1.0
 * @status experimental
 * @category actions
 * @aliases Speed dial action, FAB action, Quick action
 * @documentation https://helix.fusion.dev/components/speed-dial
 *
 * @slot - The action's name.
 * @slot icon - The mark, which is what a dial is read by.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the action is chosen. Cancelable: refusing it takes the decision and nothing moves.
 *
 * @csspart icon - The mark's box.
 * @csspart item - The control.
 * @csspart label - The name beside it.
 */
@customElement('helix-headless-speed-dial-item')
export class HelixHeadlessSpeedDialItem extends HelixElement {
  /**
   * What this action stands for, carried in the event when it is chosen.
   */
  @property()
  value = ''

  /**
   * Whether the action can be chosen.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * @internal Read by a parent to identify its children across the light DOM,
   * which is cheaper than `instanceof` and is why this is public rather than
   * protected. Not a consumer's to read or set.
   */
  readonly isSpeedDialItem = true

  /** Puts focus on the control inside, which is what a reader can reach. */
  override focus(): void {
    this.renderRoot?.querySelector<HTMLElement>('[part="item"]')?.focus()
  }

  /** `NavigableItem`, so the arrow keys are the shared controller's business. */
  focusItem(): void {
    this.focus()
  }

  /** Chooses the action, which is the same act as pressing it. */
  select(): void {
    this.choose()
  }

  /**
   * Whether this is the row the set is on, which here is where focus is.
   *
   * Asked of the document rather than of the shadow root: focus lands on the
   * control inside this element and the platform retargets it, so from outside
   * `activeElement` already is this element. `Menu.Item` records the same;
   * reading it off the shadow root does not survive happy-dom.
   */
  get selected(): boolean {
    return this.ownerDocument.activeElement === this
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
