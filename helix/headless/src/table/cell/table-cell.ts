import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One cell of a table.
 *
 * @description
 * Carries its own role, because a grid of divs is not a table to anything
 * reading it. `header` makes the cell a `columnheader`, which is what lets a
 * screen reader announce "Attribute, appearance" rather than just the value.
 *
 * The role goes on the host rather than inside the shadow root, because the
 * cell has to be a child of its row in the flat tree for the table's structure
 * to hold together.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Cell, TableCell
 * @documentation https://fusion.dev/helix/components/table
 *
 * @slot - The cell's content.
 *
 * @cssproperty --table-cell-align - The edge the column this cell sits under is set to, `start`, `center` or `end`, and unset under a column that sets none. Written by the table around it, since the cell is the consumer's markup and nothing is written onto it; read by the sheet that draws the cell, where `justify-content` and `text-align` both take it as it comes and both follow the writing direction.
 */
@customElement('helix-headless-table-cell')
export class HelixHeadlessTableCell extends HelixElement {
  /**
   * Whether the cell heads its column.
   */
  @property({ reflect: true, type: Boolean })
  header = false

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // In `willUpdate`, which the server does call, unlike `connectedCallback`.
    hostAria(this.internals, { role: this.header ? 'columnheader' : 'cell' })
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-table-cell': HelixHeadlessTableCell
  }
}
