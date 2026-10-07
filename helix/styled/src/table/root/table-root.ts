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
 * @slot empty - Content shown when there are no rows and none are loading, such as a picture and a link. Falls back to `empty-text`, which the live region still says.
 * @slot heading - Words that name the table, shown above it in the weight of a heading.
 * @slot loading - Content shown while the rows load, such as a spinner. Falls back to `loading-text`, which the live region still says.
 *
 * @csspart drag-preview - A copy of the row a pointer drags by its grip, which follows the pointer in the top layer until the row is let go, in a `reorderable` table. Hidden from assistive technology.
 * @csspart live - A live region that repeats the empty and loading text, and says each step of a move, so screen readers announce it when it changes. Visually hidden in the styled tier.
 * @csspart table - The grid.
 *
 * @cssproperty --table-columns - Track list for the columns. It overrides the track list worked out from the columns.
 * @cssproperty --table-drag-preview-background-color - The fill behind the copy of a row a pointer drags.
 * @cssproperty --table-drag-preview-border-color - The color of the edge around the copy of a row a pointer drags.
 * @cssproperty --table-drag-preview-border-width - The width of the edge around the copy of a row a pointer drags. None by default, where the shadow lifts it.
 * @cssproperty --table-drag-preview-opacity - The opacity of the copy of a row a pointer drags.
 * @cssproperty --table-drag-preview-radius - The corner radius of the copy of a row a pointer drags.
 * @cssproperty --table-drag-preview-shadow - The shadow that raises the copy of a row a pointer drags over the page.
 * @cssproperty --table-title-color - The color of the words in the `heading` slot.
 * @cssproperty --table-title-gap - The space between the `heading` slot and the grid.
 * @cssproperty --table-title-text - The font size of the words in the `heading` slot.
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
