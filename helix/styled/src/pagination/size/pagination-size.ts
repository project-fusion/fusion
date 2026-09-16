import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessPaginationSize } from '@fusion.dev/helix-headless/pagination'
import type { CSSResultGroup } from 'lit'
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
 * `Select`'s own parts are exported under `control-`, so `::part(control-trigger)` and
 * `::part(control-label)` reach through both boundaries and a consumer styles it
 * as the select it is.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Page size, Rows per page
 * @documentation https://fusion.dev/helix/components/pagination
 *
 * @csspart control - The select.
 */
@customElement('helix-pagination-size')
export class HelixPaginationSize extends HelixHeadlessPaginationSize {
  /* So the seam renders `helix-select` and `helix-option` rather than the base
     pair the headless tier composes. One word, and the template stays in one
     place. */
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-pagination-size': HelixPaginationSize
  }
}
