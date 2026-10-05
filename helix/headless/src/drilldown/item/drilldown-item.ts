import { customElement, deepActiveElement, HelixElement, HelixSelectEvent } from '@fusion.dev/helix-core'
import { caretRight } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary One row of a drill-down, which can open a page of its own.
 *
 * @description
 * A row that opens a page contains that page: the page's rows are this row's
 * own children, assigned to the `page` slot. There are no ids to wire, and
 * moving a row moves its page with it.
 *
 * What the item renders depends on the stack:
 *
 * - On the page that is showing, it renders its row.
 * - When its own page is showing, it renders only that page's rows. Its row
 *   belongs to the page above.
 * - Otherwise it renders nothing. The rows stay in the light DOM untouched, so
 *   there is no state to keep.
 *
 * Choosing a row dispatches an event, and the stack decides whether that drills
 * in or runs a command.
 *
 * A row that opens a page shows a caret after its text and sets
 * `aria-haspopup`, the same way `Menu` marks a row with a submenu. The server
 * render leaves both out, because the server cannot see the children.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Panel item, Drill row
 * @documentation https://fusion.dev/helix/components/drilldown
 *
 * @slot - The row's label.
 * @slot end - Content after the label, usually an icon or a count.
 * @slot page - The rows of the page this row opens.
 * @slot start - Content before the label, usually an icon.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the row is chosen. Cancelable: canceling it stops the change and leaves the decision to you.
 *
 * @csspart item - The row itself.
 * @csspart label - The row's label.
 * @csspart mark - The caret at the end of a row that opens a page, after the `end` slot. The caret points, so a stylesheet mirrors it in a right-to-left document.
 */
@customElement('helix-headless-drilldown-item')
export class HelixHeadlessDrilldownItem extends HelixElement {
  /**
   * Whether the row can be reached at all.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * Whether this row holds the region's tab stop. Set by the drill-down.
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
   * Identifies the row to your event listeners.
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

  /**
   * Whether this is the current row, which in a drill-down is the row with
   * focus.
   *
   * A radio group's selection is an answer it holds; a page of rows has no
   * answer, only the row a reader has walked to, so focus is the whole of what
   * "the current one" can mean here. This is `Menu.Item`'s reading word for
   * word, and the two are one pattern: a menu that drills and a drill-down are
   * the same rows through the same controller.
   *
   * The focused node is found through every shadow root and asked whether it
   * is in this row's own, as `Menu.Item` does, so a drill-down inside another
   * component's shadow root still knows its current row.
   */
  get selected(): boolean {
    const active = deepActiveElement()
    return active !== null && active.getRootNode() === this.renderRoot
  }

  /** Fires `helix-select` for this row. */
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
