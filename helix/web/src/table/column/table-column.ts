import { customElement } from '@helix-io/core'
import { HelixBaseTableColumn } from '@helix-io/headless/table'
import type { CSSResultGroup } from 'lit'
import { styles } from './table-column.css.js'

/**
 * @summary One column of a table: its heading, and how wide it is.
 *
 * @description
 * Styled as the header cell it is, and it carries the same rule and inset as
 * the cells beneath it so the heading and its column read as one line down the
 * table.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Column header, Th
 * @documentation https://helix.fusion.dev/components/table
 */
@customElement('helix-table-column')
export class HelixTableColumn extends HelixBaseTableColumn {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-table-column': HelixTableColumn
  }
}
