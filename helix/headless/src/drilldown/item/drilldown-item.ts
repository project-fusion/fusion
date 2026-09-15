import { customElement, HelixElement, HelixSelectEvent } from '@fusion.dev/helix-core'
import { caretRight } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary One row of a drill-down, which may hold a page of its own.
 *
 * @description
 * A row that opens a page *contains* that page: its rows are this row's own
 * children, assigned to the `page` slot. The tree is the structure, so there
 * are no ids to wire and a consumer who moves a row has moved its page with it.
 *
 * **It renders one of three things**, and which one is the stack's business
 * rather than its own. On the page showing, it is a row. Showing its own page,
 * it contributes that page's rows and nothing else, because its row belongs to
 * the page above. On neither, it renders nothing at all: the rows are in the
 * light DOM and come back untouched, so there is no state to keep and nothing
 * to hide with an attribute this element would have to write onto itself.
 *
 * Choosing is announced, never applied. The row dispatches and the stack
 * decides whether that means drilling in or choosing a command.
 *
 * **A row that opens a page says so**, with a caret after its words and
 * `aria-haspopup`, the way `Menu` marks a row with a submenu: a row that goes
 * somewhere and a row that does something otherwise look the same until one is
 * pressed. Not on the server, which cannot see the children and so cannot know.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Panel item, Drill row
 * @documentation https://helix.fusion.dev/components/drilldown
 *
 * @slot - The words naming this row.
 * @slot end - After the words, usually a mark or a count.
 * @slot page - The rows of the page this one opens.
 * @slot start - Before the words, usually an icon.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the row is chosen. Cancelable: refusing it takes the decision and nothing moves.
 *
 * @csspart item - The row itself.
 * @csspart label - The words.
 * @csspart mark - The caret at the end of a row that opens a page, after the `end` slot. A caret points, so a sheet mirrors it in a right-to-left document.
 */
@customElement('helix-headless-drilldown-item')
export class HelixHeadlessDrilldownItem extends HelixElement {
  /**
   * Whether the row can be reached at all.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * Whether this row holds the region's tab stop. Written by the stack.
   *
   * A drill-down keeps one stop and moves within it on the arrows, so every
   * other row is at `-1`. Leave it off every row, including the first, and
   * nothing in the region is tab-reachable: the keyboard cannot get in without
   * first clicking something with a pointer.
   *
   * No attribute, the same as `Button`'s: this is coordination between
   * elements, and writing `tabindex` onto a host the consumer rendered is a
   * change a React consumer's hydration reports and does not patch up. The stop
   * lands inside this shadow root instead.
   */
  @property({ attribute: false })
  focusable = false

  /**
   * @internal Read by a parent to identify its children across the light DOM,
   * which is cheaper than `instanceof` and is why this is public rather than
   * protected. Not a consumer's to read or set.
   */
  readonly isDrilldownItem = true

  /**
   * Whether the page showing is the one this row is on.
   *
   * Written by the stack.
   */
  @property({ attribute: false })
  onPage = true

  /**
   * Whether this row's own page is the one showing.
   *
   * Written by the stack.
   */
  @property({ attribute: false })
  showingPage = false

  /**
   * Identifies the row to whatever is listening.
   */
  @property()
  value = ''

  /**
   * Whether anything is slotted into `page`.
   *
   * State rather than a getter over `children`, for the reason `Menu.Item`
   * backs `hasSubmenu` the same way: a getter is read during `render()` with
   * nothing to re-read it, so a page a framework fills after the row's first
   * render would open with no caret on the row that leads to it.
   */
  @state()
  private page = false

  /**
   * Reads the children before each render, where they can be known.
   *
   * Not on the server, where there are none to read, nor while hydrating what
   * one sent, whose row carried no caret. `finishHydration` asks for the read
   * that skipped.
   */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (this.childrenKnown) {
      this.page = this.knownChildren.some((child) => child.slot === 'page')
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  /**
   * Re-reads whether a page is slotted, from whichever `page` slot is current.
   *
   * Bound in the template, on both of them. The row and the page it opens each
   * render a `slot[name="page"]`, and moving between them makes Lit build a new
   * slot and throw the old one away, which fires on its way out with nothing
   * assigned: a listener on the discarded one would clear the caret on every row
   * that has been drilled into and back out of. `Menu.Item.readSubmenu` carries
   * the same note.
   */
  private readonly readPage = (): void => {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot[name="page"]')
    this.page = (slot?.assignedElements().length ?? 0) > 0
  }

  /** Moves focus onto the row itself. */
  focusItem(): void {
    this.partNamed('item')?.focus()
  }

  /** Announces that this row was chosen. */
  select(): void {
    if (this.disabled) {
      return
    }
    this.dispatchEvent(new HelixSelectEvent({ value: this.value }))
  }

  protected override render(): TemplateResult | typeof nothing {
    if (this.showingPage) {
      return html`<slot name="page" @slotchange=${this.readPage}></slot>`
    }
    if (!this.onPage) {
      return nothing
    }
    /* A real `<button>`, and `role="menuitem"` on it.
     *
     * A `<div role="button">` with a click handler cannot be activated from the
     * keyboard: Enter and Space are behavior the platform gives a real button
     * and gives nothing else. Same argument `Button` makes for rendering one
     * rather than reproducing it.
     *
     * `menuitem` because the stack says `role="menu"`, and a menu whose
     * children are buttons is not a menu: a reader would be told the count of
     * items by one role and the kind of them by the other.
     *
     * `aria-disabled` rather than `disabled`, so a row that cannot be chosen is
     * still reachable and still announces why. `select()` is what refuses.
     *
     * The page's slot stays while the row shows, in a hidden box, so a page
     * that arrives later is heard and the caret follows it. Nothing in it
     * paints: its rows are not on the page showing and draw nothing, and
     * anything else in it is hidden with the box. */
    return html`<button
      part="item"
      type="button"
      role="menuitem"
      aria-disabled=${this.disabled ? 'true' : nothing}
      aria-haspopup=${this.page ? 'menu' : nothing}
      tabindex=${this.focusable ? '0' : '-1'}
      @click=${() => this.select()}
    >
      <slot name="start"></slot>
      <span part="label"><slot></slot></span>
      <slot name="end"></slot>
      ${
        this.page
          ? html`<svg part="mark" data-mirror fill="currentColor" viewBox=${caretRight.viewBox} aria-hidden="true">
              ${unsafeSVG(caretRight.content)}
            </svg>`
          : nothing
      }
    </button>
    <div hidden><slot name="page" @slotchange=${this.readPage}></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-drilldown-item': HelixHeadlessDrilldownItem
  }
}
