import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTableColumn } from '@fusion.dev/helix-headless/table'
import type { CSSResultGroup } from 'lit'
import { styles } from './table-column.css.js'

/**
 * @summary One column of a table: its heading and its width.
 *
 * @description
 * Styled as a header cell, with the same rule and inset as the cells below it,
 * so the heading and its column read as one line down the table.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Column header, Th
 * @documentation https://fusion.dev/helix/components/table
 */
@customElement('helix-table-column')
export class HelixTableColumn extends HelixHeadlessTableColumn {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-table-column': HelixTableColumn
  }
}
