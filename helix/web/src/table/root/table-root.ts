import { customElement } from '@helix-io/core'
import { HelixBaseTable } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './table-root.css.js'

/**
 * @summary Tabular data laid out on a grid.
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
 * @slot - The table's rows.
 *
 * @csspart table - The grid.
 *
 * @cssproperty --table-columns - Track list for the columns.
 */
@customElement('helix-table')
export class HelixTable extends HelixBaseTable {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-table': HelixTable
  }
}
