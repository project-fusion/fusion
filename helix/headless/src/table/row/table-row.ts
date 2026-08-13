import { customElement, HelixElement } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'

/**
 * @summary One row of a table.
 *
 * @description
 * `display: contents` in the styled tier, so the row's cells become items of
 * the table's own grid and every column lines up across every row. The row
 * still exists as an element, which is what a `<table>` gives away when its
 * cells are laid out by the table algorithm.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Row, TableRow
 * @documentation https://helix.fusion.dev/components/table
 *
 * @slot - The row's cells.
 */
@customElement('helix-base-table-row')
export class HelixBaseTableRow extends HelixElement {
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host, and required: `display: contents` removes the row's box but
    // not the row from the table's structure. Without this the table has cells
    // and no rows, which is a broken table rather than a plain one.
    //
    // Set in `willUpdate`, which the server does call, unlike `connectedCallback`.
    this.setAttribute('role', 'row')
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-table-row': HelixBaseTableRow
  }
}
