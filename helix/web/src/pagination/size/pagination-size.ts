import { customElement } from '@helix-io/core'
import { HelixBasePaginationSize } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
/* Side-effect imports, for the reason `Select` gives about the listbox it
   renders: this renders `<helix-select>` and `<helix-option>` in its own shadow
   root, a custom element registers on import, and an unregistered one is legal
   HTML that reports nothing and simply never upgrades. */
import '../../option/index.js'
import '../../select/index.js'
import { styles } from './pagination-size.css.js'

/**
 * @summary Chooses how many items a page holds.
 *
 * @description
 * A `Select`, laid out on one row. Every other field stacks its label because it
 * stands in a column of fields; this one stands in a footer beside a run of page
 * numbers, where a two-line control makes the whole row two lines tall.
 *
 * `Select`'s own parts are exported, so `::part(trigger)` and `::part(label)`
 * reach through both boundaries and a consumer styles it as the select it is.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Page size, Rows per page
 * @documentation https://helix.fusion.dev/components/pagination
 *
 * @csspart control - The select.
 */
@customElement('helix-pagination-size')
export class HelixPaginationSize extends HelixBasePaginationSize {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-pagination-size': HelixPaginationSize
  }
}
