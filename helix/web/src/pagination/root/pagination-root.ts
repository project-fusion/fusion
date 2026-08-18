import { customElement } from '@helix-io/core'
import { HelixBasePagination } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './pagination-root.css.js'

/**
 * @summary Moves between pages of a longer result.
 *
 * @description
 * One box for every control in the row, arrows and numbers alike, so the run has
 * a single rhythm and the steps sit at the numbers' height rather than between
 * them. Square, because a page number is one or two characters and a box sized
 * to the widest would leave the short ones swimming; `min-inline-size` rather
 * than a fixed one, so page 100 grows instead of overflowing.
 *
 * Figures are tabular throughout. A page number is the one thing here that
 * changes under the pointer, and proportional digits make the whole row shuffle
 * as it does.
 *
 * The current page is a raised chip rather than a brand fill, which is the
 * treatment `Tabs` gives its selected tab. Brand on a page number claims more
 * than the state deserves: it is not a choice the reader made about anything,
 * it is where they happen to be standing, and a row of grey numbers with one
 * blue one reads as the blue one being an action.
 *
 * Selected on `aria-current` rather than on a second attribute saying the same
 * thing: the state is already in the accessibility tree, and a `data-current`
 * beside it would be two places to keep in step.
 *
 * The gap takes the same box as everything else in the row and only sits back a
 * shade in colour. It is a control, so it answers hover and focus like one; it
 * is a way through rather than a destination, so it does not compete.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Pager, Page nav
 * @documentation https://helix.fusion.dev/components/pagination
 *
 * @csspart list - The run of pages.
 * @csspart item - One slot in the run, holding a page or a gap.
 * @csspart page - The control for one page.
 * @csspart gap - The control standing over pages not shown, which jumps into them.
 * @csspart previous - The control that moves back one page.
 * @csspart next - The control that moves forward one page.
 * @csspart first - The control that jumps to the first page, under `ends`.
 * @csspart last - The control that jumps to the last page, under `ends`.
 * @csspart status - The reading of where you are, in `compact`.
 *
 * @cssproperty --pagination-current-color - Fill behind the page you are on.
 * @cssproperty --pagination-gap - Space between one control and the next.
 * @cssproperty --pagination-hover-color - Fill behind a control under the pointer.
 * @cssproperty --pagination-size - The box every control in the row takes.
 */
@customElement('helix-pagination')
export class HelixPagination extends HelixBasePagination {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-pagination': HelixPagination
  }
}
