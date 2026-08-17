import { customElement, HelixElement, HelixSelectEvent } from '@helix-io/core'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

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
 * @since 0.1.0
 * @status experimental
 * @aliases Panel item, Drill row
 * @documentation https://helix.fusion.dev/components/drilldown
 *
 * @slot - The words naming this row.
 * @slot page - The rows of the page this one opens.
 * @slot start - Before the words, usually an icon.
 * @slot end - After the words, usually a mark or a count.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the row is chosen.
 *
 * @csspart item - The row itself.
 * @csspart label - The words.
 */
@customElement('helix-base-drilldown-item')
export class HelixBaseDrilldownItem extends HelixElement {
  /** Whether the row can be reached at all. */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /** Identifies the row to whatever is listening. */
  @property()
  value = ''

  /** Marks this as a row a stack should count. Cheaper than an instanceof. */
  readonly isDrilldownItem = true

  /** Whether the page showing is the one this row is on. Written by the stack. */
  @property({ attribute: false })
  onPage = true

  /** Whether this row's own page is the one showing. Written by the stack. */
  @property({ attribute: false })
  showingPage = false

  /**
   * Whether this row holds the region's tab stop. Written by the stack.
   *
   * A drill-down keeps one stop and moves within it on the arrows, so every
   * other row is at `-1`. Every row was, including the first, which left
   * nothing in the region tab-reachable at all: the keyboard could not get in
   * without first clicking something with a pointer.
   *
   * No attribute, the same as `Button`'s: this is coordination between
   * elements, and writing `tabindex` onto a host the consumer rendered is a
   * change a React consumer's hydration reports and does not patch up. The stop
   * lands inside this shadow root instead.
   */
  @property({ attribute: false })
  focusable = false

  /** Moves focus onto the row itself. */
  focusItem(): void {
    this.renderRoot.querySelector<HTMLElement>('[part="item"]')?.focus()
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
      return html`<slot name="page"></slot>`
    }
    if (!this.onPage) {
      return nothing
    }
    /* A real `<button>`, and `role="menuitem"` on it.
     *
     * It was a `<div role="button">` with a click handler and nothing else, so
     * the row could not be activated from the keyboard at all: Enter and Space
     * are behaviour the platform gives a real button and gives nothing else,
     * and neither was handled here. Same argument `Button` makes for rendering
     * one rather than reproducing it.
     *
     * `menuitem` because the stack says `role="menu"`, and a menu whose
     * children are buttons is not a menu: the roles contradicted each other and
     * a reader was told the count of items by one and the kind of them by the
     * other.
     *
     * `aria-disabled` rather than `disabled`, so a row that cannot be chosen is
     * still reachable and still announces why. `select()` is what refuses. */
    return html`<button
      part="item"
      type="button"
      role="menuitem"
      aria-disabled=${this.disabled ? 'true' : nothing}
      tabindex=${this.focusable ? '0' : '-1'}
      @click=${() => this.select()}
    >
      <slot name="start"></slot>
      <span part="label"><slot></slot></span>
      <slot name="end"></slot>
    </button>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-drilldown-item': HelixBaseDrilldownItem
  }
}
