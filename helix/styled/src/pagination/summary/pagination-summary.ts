import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessPaginationSummary } from '@fusion.dev/helix-headless/pagination'
import type { CSSResultGroup } from 'lit'
import { styles } from './pagination-summary.css.js'

/**
 * @summary Text that shows which items are on the current page, out of the total.
 *
 * @description
 * Prose beside the controls rather than one of them: no box and no hover, in the
 * subtler of the two muted steps, because it is a fact about the result and not
 * a way to move through it.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Result count, Range
 * @documentation https://fusion.dev/helix/components/pagination
 */
@customElement('helix-pagination-summary')
export class HelixPaginationSummary extends HelixHeadlessPaginationSummary {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-pagination-summary': HelixPaginationSummary
  }
}
