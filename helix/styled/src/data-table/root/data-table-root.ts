import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDataTable } from '@fusion.dev/helix-headless/data-table'
import type { CSSResultGroup } from 'lit'
import { styles as collectionStateStyles } from '../../shared/collection/state.css.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './data-table-root.css.js'
import '../../checkbox/index.js'
import '../../pagination/index.js'
import '../../table/index.js'

/**
 * @summary A table drawn from an array of rows, with sorting, filtering, and paging.
 *
 * @description
 * Rows have hairline rules between them and no fill, and the headings are set
 * apart by weight and color. Helix shows depth with a single border and no
 * elevation, and a header band would be elevation.
 *
 * The grid scrolls in its own box, and the toolbar and footer sit outside it,
 * so the search field stays in place when the columns scroll sideways.
 *
 * `windowed` draws only the rows in view, for a result too long to lay out at
 * once, and the headings stay in place while the rows scroll. It works with or
 * without `paginated` and with either `mode`, so a page or a chunk from a
 * server can be windowed.
 *
 * **The cell values do not server-render.** Use `helix-table` when the content
 * has to be in the served HTML.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @documentation https://fusion.dev/helix/components/data-table
 *
 * @slot - The columns, as `TableColumn` elements.
 * @slot footer - Content below the grid. It replaces the built-in pagination.
 * @slot toolbar - Content above the grid, such as a search field or actions.
 *
 * @csspart cell - One cell.
 * @csspart cell-selected - Added to `cell` in a selected row.
 * @csspart live - A copy of the empty and loading messages, which screen readers announce when they change. Visually hidden in the styled tier.
 * @csspart table - The grid.
 *
 * @cssproperty --data-table-block-size - The height of the scrolling box while `windowed`.
 * Ignored otherwise, where the grid is as tall as its rows. It is a fixed height, so a
 * short result keeps the full box with space below it.
 * @cssproperty --data-table-color - The text color of a cell.
 * @cssproperty --data-table-columns - The grid track list for the columns. It overrides the list worked out from the columns.
 * @cssproperty --data-table-footer-gap - The space between the grid and the footer below it.
 * @cssproperty --data-table-footer-item-gap - The space between the pieces of the footer, such as a summary and the pagination.
 * @cssproperty --data-table-heading-background-color - The fill behind a heading while `windowed`.
 * It is opaque, because rows scroll under the sticky heading. Unset otherwise.
 * @cssproperty --data-table-heading-color - The text color of a heading.
 * @cssproperty --data-table-indent - How far a tree grid's row header steps in for each level. It defaults to the width of the mark that opens a row.
 * @cssproperty --data-table-more-border-color - The color of the edge around the button in the `load-more` row.
 * @cssproperty --data-table-more-hover-background-color - The fill behind the button in the `load-more` row while the pointer is over it.
 * @cssproperty --data-table-more-padding-block - The space above and below the words of the button in the `load-more` row.
 * @cssproperty --data-table-more-padding-inline - The space either side of the words of the button in the `load-more` row.
 * @cssproperty --data-table-more-radius - The corner radius of the button in the `load-more` row.
 * @cssproperty --data-table-padding-block - The space above and below a cell's content.
 * @cssproperty --data-table-padding-inline - The space on either side of a cell's content.
 * @cssproperty --data-table-rule-color - The color of the line between rows. It takes a
 * color only, because it fills the color in a border shorthand, and a full border value
 * makes the rule invalid. It is drawn on the cells, because the row is `display: contents`.
 * @cssproperty --data-table-selected-background-color - The fill across a selected row.
 * @cssproperty --data-table-text - The font size of headings and cells.
 * @cssproperty --data-table-toggle-color - The color of the mark that opens and closes a row of a tree grid.
 * @cssproperty --data-table-toggle-gap - The space between the mark that opens a row of a tree grid and the row's name, also kept by a row with no children.
 * @cssproperty --data-table-toggle-size - The size of the mark that opens and closes a row of a tree grid, and of the room a row with no children keeps for it.
 * @cssproperty --data-table-toolbar-gap - The space between the toolbar and the grid below it.
 */
@customElement('helix-data-table')
export class HelixDataTable extends HelixHeadlessDataTable {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [liveStyles, collectionStateStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-data-table': HelixDataTable
  }
}
