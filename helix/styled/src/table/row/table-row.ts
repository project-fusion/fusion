import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTableRow } from '@fusion.dev/helix-headless/table'
import type { CSSResultGroup } from 'lit'
import { styles } from './table-row.css.js'
import '../../checkbox/index.js'

/**
 * @summary One row of a table.
 *
 * @description
 * The row has no box of its own, so its cells become items of the table's grid
 * and line up with every other row. The element still exists, so a row can be
 * selected, hidden, or made interactive without a wrapper that would break the
 * columns.
 *
 * @since 0.1.0
 * @status stable
 * @documentation https://fusion.dev/helix/components/table
 *
 * @slot - The row's cells.
 *
 * @cssproperty --table-dragging-opacity - The opacity of a row being moved, in a `reorderable` table.
 * @cssproperty --table-drop-indicator-color - The color of the line where a moved row would land.
 * @cssproperty --table-drop-indicator-size - The thickness of the line where a moved row would land.
 * @cssproperty --table-expand-color - The color of a row's disclosure button, in a table whose rows nest.
 * @cssproperty --table-grip-color - The color of a row's grip, in a `reorderable` table.
 * @cssproperty --table-grip-disabled-opacity - The opacity of a row's grip while a sort decides the order.
 * @cssproperty --table-indent - How far each step of depth sets a nested row's disclosure cell in.
 * @cssproperty --table-row-disabled-opacity - The opacity of the cells of a `disabled` row.
 * @cssproperty --table-row-hover-background-color - The wash across the cells of a row with `href` under the pointer.
 */
@customElement('helix-table-row')
export class HelixTableRow extends HelixHeadlessTableRow {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-table-row': HelixTableRow
  }
}
