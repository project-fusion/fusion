import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTableRow } from '@fusion.dev/helix-headless/table'
import type { CSSResultGroup } from 'lit'
import { styles } from './table-row.css.js'

/**
 * @summary One row of a table.
 *
 * @description
 * No box of its own, so its cells become items of the table's grid and line up
 * with every other row's. The element still exists, which is what lets a row be
 * selected, hidden or made interactive without a wrapper that would break the
 * columns.
 *
 * @since 0.1.0
 * @status stable
 * @documentation https://fusion.dev/helix/components/table
 *
 * @slot - The row's cells.
 */
@customElement('helix-table-row')
export class HelixTableRow extends HelixHeadlessTableRow {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-table-row': HelixTableRow
  }
}
