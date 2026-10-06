import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessPagination } from '@fusion.dev/helix-headless/pagination'
import type { CSSResultGroup } from 'lit'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './pagination-root.css.js'

/**
 * @summary Controls for moving between the pages of a long set of results.
 *
 * @description
 * Every control in the row, arrows and numbers alike, uses the same box, so the
 * row has one rhythm. Boxes are square with a `min-inline-size`, so page 100
 * grows wider and does not overflow.
 *
 * Figures are tabular, so the row does not shift as the page number changes.
 *
 * The current page is a raised chip, the same treatment `Tabs` gives its
 * selected tab. A brand fill would make the current page look like an action.
 * It is styled from `aria-current`, so there is no second attribute to keep in
 * sync.
 *
 * A gap uses the same box in a slightly muted color. It responds to hover and
 * focus like any control, and it does not stand out from the numbers.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Pager, Page nav
 * @documentation https://fusion.dev/helix/components/pagination
 *
 * @csspart first - The control that jumps to the first page, under `ends`.
 * @csspart gap - The control in place of hidden pages, which jumps into them.
 * @csspart item - One slot in the run, holding a page or a gap.
 * @csspart last - The control that jumps to the last page, under `ends`.
 * @csspart list - The run of pages.
 * @csspart next - The control that moves forward one page.
 * @csspart page - The control for one page.
 * @csspart page-current - The page you are on, beside `page`.
 * @csspart previous - The control that moves back one page.
 * @csspart status - The text that says which page you are on, in `compact`.
 *
 * @cssproperty --pagination-current-border-color - Edge of the page you are on.
 * @cssproperty --pagination-current-color - Fill behind the page you are on.
 * @cssproperty --pagination-current-font-weight - Weight of the number of the page you are on.
 * @cssproperty --pagination-current-foreground-color - Color of the number of the page you are on.
 * @cssproperty --pagination-disabled-foreground-color - Color of a first, previous, next or last control with nowhere to go.
 * @cssproperty --pagination-disabled-opacity - How faint a control with nowhere to go is drawn.
 * @cssproperty --pagination-ellipsis-foreground-color - Color of the control that stands in for hidden pages.
 * @cssproperty --pagination-font-size - Size of the numbers and the status text.
 * @cssproperty --pagination-font-weight - Weight of the numbers and the status text.
 * @cssproperty --pagination-foreground-color - Color of the numbers and the marks on every control.
 * @cssproperty --pagination-gap - Space between one control and the next.
 * @cssproperty --pagination-hover-color - Fill behind a control under the pointer.
 * @cssproperty --pagination-hover-foreground-color - Color of a control's number or mark under the pointer.
 * @cssproperty --pagination-icon-size - Size of the mark on a first, previous, next or last control, drawn or slotted.
 * @cssproperty --pagination-padding - Space either side of a control's number or mark.
 * @cssproperty --pagination-radius - Corner radius of every control in the row.
 * @cssproperty --pagination-size - The box every control in the row takes.
 * @cssproperty --pagination-status-foreground-color - Color of the text that says which page you are on, in `compact`.
 */
@customElement('helix-pagination')
export class HelixPagination extends HelixHeadlessPagination {
  static override styles: CSSResultGroup = [liveStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-pagination': HelixPagination
  }
}
