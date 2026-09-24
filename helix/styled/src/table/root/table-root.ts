import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTable } from '@fusion.dev/helix-headless/table'
import type { CSSResultGroup } from 'lit'
import { styles as collectionStateStyles } from '../../shared/collection/state.css.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
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
 * @status stable
 * @category data
 * @documentation https://fusion.dev/helix/components/table
 *
 * @slot - The table's rows.
 *
 * @csspart live - The empty and loading lines again, in a region a screen reader hears when they change. Visually hidden in the styled tier.
 * @csspart table - The grid.
 *
 * @cssproperty --table-columns - Track list for the columns, which wins over the one the columns worked out.
 */
@customElement('helix-table')
export class HelixTable extends HelixHeadlessTable {
  static override styles: CSSResultGroup = [liveStyles, collectionStateStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-table': HelixTable
  }
}
