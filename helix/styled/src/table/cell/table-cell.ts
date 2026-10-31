import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTableCell } from '@fusion.dev/helix-headless/table'
import type { CSSResultGroup } from 'lit'
import { styles } from './table-cell.generated.css.js'

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
 *
 * @cssproperty --table-cell-min-block-size - The least height of a cell, and so of its
 * row. Unset, every row is as tall as a control, whatever its cells hold.
 * @cssproperty --table-padding-block - The space above and below a cell's content. Two
 * values set the space above and the space below.
 * @cssproperty --table-rule-color - The color of the line under a cell, which is the line
 * between rows. It takes a color only, because it fills the color in a border shorthand,
 * and a full border value makes the rule invalid. It is drawn on the cells, because the
 * row is `display: contents`.
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
