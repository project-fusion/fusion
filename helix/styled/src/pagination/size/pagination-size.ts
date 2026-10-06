import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessPaginationSize } from '@fusion.dev/helix-headless/pagination'
import type { CSSResultGroup } from 'lit'
import '../../option/index.js'
import '../../select/index.js'
import { styles } from './pagination-size.css.js'

/**
 * @summary A control for choosing how many items each page shows.
 *
 * @description
 * A `Select` laid out on one row. Other fields stack their label because they
 * sit in a column of fields. This one sits in a footer beside the page numbers,
 * where a two-line control would make the whole row two lines tall.
 *
 * `Select`'s parts are exported with a `control-` prefix, so
 * `::part(control-trigger)` and `::part(control-label)` reach through both
 * shadow boundaries, and you can style it like any select.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Page size, Rows per page
 * @documentation https://fusion.dev/helix/components/pagination
 *
 * @csspart control - The select.
 *
 * @cssproperty --pagination-size - Height of the select's trigger, the same hook that sizes every control in the page row.
 * @cssproperty --pagination-size-gap - Space between the label and the select.
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
