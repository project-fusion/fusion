import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessPaginationSummary } from '@fusion.dev/helix-headless/pagination'
import type { CSSResultGroup } from 'lit'
import { styles } from './pagination-summary.css.js'

/**
 * @summary Text that shows which items are on the current page, out of the total.
 *
 * @description
 * Plain text beside the controls, with no box and no hover, in the lighter of
 * the two muted colors. It reports the result and is not a control.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Result count, Range
 * @documentation https://fusion.dev/helix/components/pagination
 *
 * @cssproperty --pagination-font-size - Size of the text, the same hook that sizes the page numbers.
 * @cssproperty --pagination-summary-foreground-color - Color of the text.
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
