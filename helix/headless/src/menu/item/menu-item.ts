import { customElement, HelixElement, HelixSelectEvent } from '@helix-io/core'
import { caretRight, check } from '@helix-io/icons'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

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
 * @csspart mark - The trailing mark: a tick when checked, a caret when it opens
 * a page. One column, because a row is never both.
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

  /**
   * Whether this row's submenu is the page showing.
   *
   * Separate from `onPage`, and it has to be. A row that opened a page is not
   * itself on that page, so both are false for it, and rendering nothing on
   * that basis takes its `slot[name="submenu"]` with it: the rows inside have
   * nowhere to be assigned and are never laid out. The element that holds the
   * page has to keep the slot even when it shows no row of its own.
   */
  @property({ attribute: false })
  showingSubmenu = false

  /** Marks this as a row a menu should count. Cheaper than an instanceof. */
  readonly isMenuItem = true

  /**
   * Whether anything was slotted into `submenu`.
   *
   * Client only, and the `?? []` is what makes that true rather than merely
   * documented. Lit's element shim carries attributes but not a tree, so
   * `children` is undefined on the server, and this getter is read during
   * `render`: spreading it threw, and a menu row could not be served at all.
   * Found by writing this component's SSR spec, which is the only place it
   * could have been found, because every other path runs in a browser.
   *
   * False on the server is also the right answer rather than a safe one: the
   * server cannot know whether a submenu was slotted, and a row that served a
   * `aria-haspopup` it might not have would be a promise made to a screen
   * reader on the strength of a guess.
   */
  get hasSubmenu(): boolean {
    return [...(this.children ?? [])].some((child) => child.slot === 'submenu')
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
    // The page this row opened is showing, so what it contributes is the slot
    // its rows are assigned to and nothing else. Its own row belongs to the
    // page above.
    if (this.showingSubmenu) {
      return html`<slot name="submenu"></slot>`
    }
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
        <slot></slot>
        ${
          // One trailing column, and a row is never both: a way into a page has
          // nothing to tick, and a choice opens nothing. The tick sits after the
          // label rather than before it, so the labels start at the edge of the
          // row and the marks line up down the side they are read from.
          submenu
            ? html`<svg
                part="mark"
                fill="currentColor"
                viewBox=${caretRight.viewBox}
                aria-hidden="true"
              >
                ${unsafeSVG(caretRight.content)}
              </svg>`
            : this.checked
              ? html`<svg
                  part="mark"
                  fill="currentColor"
                  viewBox=${check.viewBox}
                  aria-hidden="true"
                >
                  ${unsafeSVG(check.content)}
                </svg>`
              : html`<span part="mark" aria-hidden="true"></span>`
        }
      </div>
      <slot name="submenu"></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-menu-item': HelixBaseMenuItem
  }
}
