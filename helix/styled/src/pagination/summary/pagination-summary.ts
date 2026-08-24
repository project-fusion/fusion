import { customElement } from '@helix-io/core'
import { HelixHeadlessPaginationSummary } from '@helix-io/headless/pagination'
import type { CSSResultGroup } from 'lit'
import { styles } from './pagination-summary.css.js'

/**
 * @summary Reads out which items of how many are on show.
 *
 * @description
 * Prose beside the controls rather than one of them: no box and no hover, in the
 * subtler of the two muted steps, because it is a fact about the result and not
 * a way to move through it.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Result count, Range
 * @documentation https://helix.fusion.dev/components/pagination
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
