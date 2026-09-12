import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDataTable } from '@fusion.dev/helix-headless/data-table'
import type { CSSResultGroup } from 'lit'
import { styles } from './data-table-root.css.js'
import '../../checkbox/index.js'
import '../../pagination/index.js'
import '../../table/index.js'

/**
 * @summary A table that owns a result: rows as data, with sort, filter and paging.
 *
 * @description
 * Hairline rules between rows and no fill, per the rule that depth comes from a
 * single border rather than from elevation. A header band would be elevation
 * spelled differently, so the headings are weight and color instead.
 *
 * The grid scrolls its own box and the toolbar and footer sit outside it: a
 * search field that slides sideways when a reader scrolls the columns is a
 * search field they lose.
 *
 * `windowed` draws only the rows in view, for a result too long to lay out at
 * once, and the headings stay put while they scroll. It is independent of
 * `paginated` and of `mode`, so a page can be windowed and a server-fed chunk
 * can be too.
 *
 * **The cell values do not server-render**, which is the headless tier's
 * limitation and worth repeating where a consumer chooses between the two: use
 * `helix-table` where the content has to be in the served HTML.
 *
 * @since 0.1.0
 * @status experimental
 * @category data
 * @documentation https://helix.fusion.dev/components/data-table
 *
 * @slot - The columns, declared as `helix-table-column` children.
 * @slot footer - Below the grid, replacing the pagination this would otherwise draw.
 * @slot toolbar - Above the grid, for a search field or actions.
 *
 * @csspart cell - One cell.
 * @csspart table - The grid.
 *
 * @cssproperty --data-table-block-size - How tall the scrolling box is while `windowed`.
 * Ignored otherwise, where the grid is as tall as its rows. A definite height rather than a
 * maximum, so a short result under `windowed` keeps the full box with space below it: a
 * maximum would leave the height a function of the rows drawn, and the rows drawn a function
 * of the height, which is the loop the window controller has to guard against rather than
 * one worth entering on purpose.
 * @cssproperty --data-table-color - Ink in a cell.
 * @cssproperty --data-table-columns - Track list for the columns, which wins over the one the columns worked out.
 * @cssproperty --data-table-heading-background-color - Fill behind a heading while `windowed`.
 * Opaque on purpose: rows scroll under a sticky heading and a transparent one lets them
 * through. Unset otherwise, so the headings stay weight rather than a band.
 * @cssproperty --data-table-heading-color - Ink in a heading.
 * @cssproperty --data-table-padding-block - Space above and below a cell's content.
 * @cssproperty --data-table-padding-inline - Space either side of a cell's content.
 * @cssproperty --data-table-rule-color - Color of the hairline between rows. A color
 * and not a border: it lands in the color slot of a shorthand, so a whole border
 * written into it produces invalid CSS and drops the rule. Drawn on the cells rather
 * than the row, which is `display: contents` and measures `0px`.
 * @cssproperty --data-table-text - Type size, headings and cells alike.
 */
@customElement('helix-data-table')
export class HelixDataTable extends HelixHeadlessDataTable {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-data-table': HelixDataTable
  }
}
