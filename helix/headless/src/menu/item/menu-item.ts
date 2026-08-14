import { customElement, HelixElement, HelixSelectEvent } from '@helix-io/core'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One row in a menu: a command, a choice, or a way into a submenu.
 *
 * @description
 * Three shapes, one element, because a reader moving down a menu with the
 * arrow keys does not care which kind each row is and neither should the
 * markup. What it is follows from what it was given: something slotted into
 * `submenu` makes it a way in, `checked` makes it a choice, and neither makes
 * it a command.
 *
 * **The role follows the shape.** A row that can be ticked is
 * `menuitemcheckbox` and carries `aria-checked`, because a reader is told "one
 * of these is on" rather than "here is a button". A row that opens a page keeps
 * `menuitem` and says `aria-haspopup`, since the page it opens is a menu.
 *
 * Whether it is on the page showing is set by the menu as a property, never as
 * an attribute: an attribute written onto a consumer's element after it
 * upgrades is a hydration mismatch waiting to happen.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Menu option, Menu row
 * @documentation https://helix.fusion.dev/components/menu
 *
 * @slot - The label.
 * @slot submenu - Rows this one opens, which makes it a way in.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the row is chosen.
 *
 * @csspart item - The row.
 * @csspart check - The mark shown when it is checked.
 * @csspart arrow - The mark shown when it opens a submenu.
 */
@customElement('helix-base-menu-item')
export class HelixBaseMenuItem extends HelixElement {
  /** What this row stands for, carried in the event when it is chosen. */
  @property()
  value = ''

  /**
   * Whether the row is one of a set of choices.
   *
   * Separate from `checked`, and it has to be. A row that is off is still a
   * choice, and `checked` alone cannot say so: an unticked row and a row that
   * was never tickable look identical from here. Announcing only the ticked one
   * as a checkbox tells a reader its siblings are commands, which is the one
   * thing they are not.
   *
   * `checked` implies it, so a row that is on never has to say both.
   */
  @property({ reflect: true, type: Boolean })
  checkable = false

  /** Whether the row is ticked. */
  @property({ reflect: true, type: Boolean })
  checked = false

  /** Whether the row can be chosen. */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * Whether this row is on the page currently showing.
   *
   * Set by the menu, and a property rather than an attribute for that reason.
   * Public because the menu has to reach it, and not something a consumer
   * writes: which page is open is the menu's business.
   */
  @property({ attribute: false })
  onPage = true

  /** Marks this as a row a menu should count. Cheaper than an instanceof. */
  readonly isMenuItem = true

  /** Whether anything was slotted into `submenu`. Client only. */
  get hasSubmenu(): boolean {
    return [...this.children].some((child) => child.slot === 'submenu')
  }

  /**
   * Moves focus onto the row itself.
   *
   * The host is not focusable: what takes focus is the row inside this shadow
   * root, and a menu moving between rows with the arrow keys has to reach it.
   */
  override focus(): void {
    this.renderRoot.querySelector<HTMLElement>('[part="item"]')?.focus()
  }

  private readonly handleClick = (): void => {
    if (this.disabled) {
      return
    }
    this.dispatchEvent(new HelixSelectEvent({ value: this.value }))
  }

  /**
   * Enter and Space choose the row, which a `<div>` would not do on its own.
   *
   * It is not a `<button>`: a button inside a menu is announced as a button,
   * and the roles a menu needs are not roles a button can take.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      this.handleClick()
    }
  }

  protected override render(): TemplateResult | typeof nothing {
    // Not on the page showing, so there is nothing to draw. Rendering nothing
    // rather than hiding it with an attribute, because the attribute would be
    // one this element wrote onto itself, and there is no state to keep: the
    // rows are in the light DOM and come back as they were.
    if (!this.onPage) {
      return nothing
    }
    const submenu = this.hasSubmenu
    return html`<div
        part="item"
        role=${this.checkable || this.checked ? 'menuitemcheckbox' : 'menuitem'}
        aria-checked=${this.checkable || this.checked ? (this.checked ? 'true' : 'false') : nothing}
        aria-disabled=${this.disabled ? 'true' : nothing}
        aria-haspopup=${submenu ? 'menu' : nothing}
        tabindex=${this.disabled ? nothing : '-1'}
        @click=${this.handleClick}
        @keydown=${this.handleKeydown}
      >
        <span part="check" aria-hidden="true"></span>
        <slot></slot>
        ${submenu ? html`<span part="arrow" aria-hidden="true"></span>` : nothing}
      </div>
      <slot name="submenu"></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-menu-item': HelixBaseMenuItem
  }
}
