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
    return html`<div
      part="item"
      role="button"
      aria-disabled=${this.disabled ? 'true' : nothing}
      tabindex=${this.disabled ? nothing : '-1'}
      @click=${() => this.select()}
    >
      <slot name="start"></slot>
      <span part="label"><slot></slot></span>
      <slot name="end"></slot>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-drilldown-item': HelixBaseDrilldownItem
  }
}
