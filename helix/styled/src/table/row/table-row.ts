import { customElement } from '@helix-io/core'
import { HelixHeadlessTableRow } from '@helix-io/headless/table'
import type { CSSResultGroup } from 'lit'
import { styles } from './table-row.css.js'

/**
 * @summary One row of a table.
 *
 * @description
 * Hairline rules between rows and no fill, per the rule that depth comes from a
 * single border rather than from elevation. A dense table earns its density by
 * decorating none of it.
 *
 * @since 0.1.0
 * @status experimental
 * @documentation https://helix.fusion.dev/components/table
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
