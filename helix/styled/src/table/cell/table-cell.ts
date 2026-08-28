import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTableCell } from '@fusion.dev/helix-headless/table'
import type { CSSResultGroup } from 'lit'
import { styles } from './table-cell.css.js'

/**
 * @summary One cell of a table.
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
 * @slot - The cell's content.
 */
@customElement('helix-table-cell')
export class HelixTableCell extends HelixHeadlessTableCell {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-table-cell': HelixTableCell
  }
}
