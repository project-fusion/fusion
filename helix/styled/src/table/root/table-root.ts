import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTable } from '@fusion.dev/helix-headless/table'
import type { CSSResultGroup } from 'lit'
import { styles as collectionErrorStyles } from '../../shared/collection/error.css.js'
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
 * @use A short table you write out by hand, with each row in the markup.
 * @instead data-table - Rows you pass as an array, with filtering and paging.
 * @instead description-list - One record's fields, each label beside its value.
 * @anatomy column
 * @anatomy row
 * @anatomy cell
 * @practice {reordering} Give each row a `value` in a `reorderable` table. - A row without one is known by its place, so its key changes as it moves.
 * @practice Put your rows in the order a reorder reports. - The table moves no element of yours.
 * @practice Set `grid` only where each cell may take focus. - A grid table gives every cell a `tabindex`, so focus can rest on it.
 * @documentation https://fusion.dev/design/components/table
 *
 * @slot - The table's rows.
 * @slot columns - The columns, as `TableColumn` elements. The table moves each column here itself, so markup that runs in a browser leaves it out; a server-rendered page writes `slot="columns"` on each column so the headings sit in place before the table upgrades.
 * @slot empty - Content shown when there are no rows and none are loading, such as a picture and a link. Falls back to `empty-text`, which the live region still says.
 * @slot error - Content shown after `error-text` while it is set, such as a button that tries again.
 * @slot heading - Words that name the table, shown above it in the weight of a heading.
 * @slot loading - Content shown while the rows load, such as a spinner. Falls back to `loading-text`, which the live region still says.
 *
 * @csspart after - The space that stands in for the rows below the window. Only while `windowed`.
 * @csspart before - The space that stands in for the rows above the window. Only while `windowed`.
 * @csspart drag-preview - A copy of the row a pointer drags by its grip, which follows the pointer in the top layer until the row is let go, in a `reorderable` table. Hidden from assistive technology.
 * @csspart live - A live region that repeats the empty and loading text, and says each step of a move, so screen readers announce it when it changes. Visually hidden in the styled tier.
 * @csspart table - The grid.
 *
 * @cssproperty --table-block-size - How tall the table's box is while `windowed`, when it scrolls its rows. 24em by default.
 * @cssproperty --table-columns - Track list for the columns. It overrides the track list worked out from the columns.
 * @cssproperty --table-drag-preview-background-color - The fill behind the copy of a row a pointer drags.
 * @cssproperty --table-drag-preview-border-color - The color of the edge around the copy of a row a pointer drags.
 * @cssproperty --table-drag-preview-border-width - The width of the edge around the copy of a row a pointer drags. None by default, where the shadow lifts it.
 * @cssproperty --table-drag-preview-opacity - The opacity of the copy of a row a pointer drags.
 * @cssproperty --table-drag-preview-radius - The corner radius of the copy of a row a pointer drags.
 * @cssproperty --table-drag-preview-shadow - The shadow that raises the copy of a row a pointer drags over the page.
 * @cssproperty --table-error-color - The color of the words in the line shown while `error-text` is set.
 * @cssproperty --table-heading-background-color - The fill behind the headings while `windowed`, which the rows scroll under. The page's background by default.
 * @cssproperty --table-move-duration - How long a row takes to slide to its new place, or to fade in. Defaults to `--helix-duration-normal`. `0ms` moves nothing.
 * @cssproperty --table-move-easing - The curve a row slides and fades in along. Defaults to `--helix-easing-standard`.
 * @cssproperty --table-title-color - The color of the words in the `heading` slot.
 * @cssproperty --table-title-gap - The space between the `heading` slot and the grid.
 * @cssproperty --table-title-text - The font size of the words in the `heading` slot.
 *
 * @replaces table
 */
@customElement('helix-table')
export class HelixTable extends HelixHeadlessTable {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [
    liveStyles,
    collectionStateStyles,
    collectionErrorStyles,
    styles,
  ]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-table': HelixTable
  }
}
