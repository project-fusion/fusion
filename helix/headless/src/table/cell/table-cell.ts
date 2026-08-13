import { customElement, HelixElement } from '@helix-io/core'
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
 * @status experimental
 * @aliases Cell, TableCell
 * @documentation https://helix.fusion.dev/components/table
 *
 * @slot - The cell's content.
 */
@customElement('helix-base-table-cell')
export class HelixBaseTableCell extends HelixElement {
  /** Whether the cell heads its column. */
  @property({ reflect: true, type: Boolean })
  header = false

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // In `willUpdate`, which the server does call, unlike `connectedCallback`.
    this.setAttribute('role', this.header ? 'columnheader' : 'cell')
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-table-cell': HelixBaseTableCell
  }
}
