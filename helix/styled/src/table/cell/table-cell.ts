import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTableCell } from '@fusion.dev/helix-headless/table'
import type { CSSResultGroup } from 'lit'
import { styles } from './table-cell.css.js'

/**
 * @summary One cell of a table.
 *
 * @description
 * Every cell has the same height whatever it holds, so a row with a tag or an
 * icon button in it sits level with a row of text. Content uses the full
 * foreground color, and a long identifier breaks onto a new line so it does not
 * run into the next column.
 *
 * @since 0.1.0
 * @status stable
 * @documentation https://fusion.dev/helix/components/table
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
