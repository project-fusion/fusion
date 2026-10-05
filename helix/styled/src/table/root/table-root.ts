import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTable } from '@fusion.dev/helix-headless/table'
import type { CSSResultGroup } from 'lit'
import { styles as collectionStateStyles } from '../../shared/collection/state.css.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './table-root.css.js'
import '../../checkbox/index.js'

/**
 * @summary A table of data, laid out on a grid.
 *
 * @description
 * Rows have hairline rules between them and no fill. Helix shows depth with a
 * single border and no elevation, and a dense table adds no other decoration.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @documentation https://fusion.dev/helix/components/table
 *
 * @slot - The table's rows.
 * @slot caption - Words that name the table, shown above it in the weight of a heading.
 *
 * @csspart live - A live region that repeats the empty and loading text, so screen readers announce it when it changes. Visually hidden in the styled tier.
 * @csspart table - The grid.
 *
 * @cssproperty --table-caption-color - The color of the caption.
 * @cssproperty --table-caption-gap - The space between the caption and the grid.
 * @cssproperty --table-caption-text - The font size of the caption.
 * @cssproperty --table-columns - Track list for the columns. It overrides the track list worked out from the columns.
 */
@customElement('helix-table')
export class HelixTable extends HelixHeadlessTable {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [liveStyles, collectionStateStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-table': HelixTable
  }
}
