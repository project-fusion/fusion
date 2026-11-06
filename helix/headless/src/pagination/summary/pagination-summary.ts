import {
  customElement,
  formatWords,
  HelixElement,
  numberConverter,
  words,
} from '@fusion.dev/helix-core'
import { pageRange } from '@fusion.dev/helix-core/pagination'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Text that shows which items are on the current page, out of the total.
 *
 * @description
 * A separate element from `Pagination`, so you decide where the count goes:
 * above, below, in a table caption, or elsewhere on the page.
 *
 * You set `page`, `page-size`, and `total` on both this element and
 * `Pagination`. They come from your own query, so use the same values for both
 * and the two elements agree.
 *
 * A shared parent cannot pass the values down. Writing attributes onto light
 * DOM children causes hydration errors in frameworks, and `@lit/context`
 * subscribes in `connectedCallback`, which Lit SSR does not call.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Result count, Range
 * @documentation https://fusion.dev/helix/components/pagination
 */
@customElement('helix-headless-pagination-summary')
export class HelixHeadlessPaginationSummary extends HelixElement {
  /**
   * The key this part's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-pagination-summary': { format: '{from} bis {to} von {total}' } })`.
   */
  static words = 'helix-pagination-summary'

  /**
   * The text shown. `{from}`, `{to}`, and `{total}` are replaced with the first
   * item, the last item, and the item count, written in the locale.
   *
   * A template rather than a prefix and a suffix, because word order is not
   * universal: `format="{total} 件中 {from}-{to} 件"` is one attribute here and
   * three concatenations anywhere else.
   *
   * **`format`, not `label`, and the difference is worth the rename.** `label`
   * across this library means the accessible name of a thing that has one:
   * `Pagination.label` names the landmark and `Pagination.Size.label` is the
   * words beside the control. This is neither. It is the whole visible content
   * of the element, so calling it `label` put one word on three jobs inside one
   * family. The root's templates are `pageLabel`, `statusLabel` and `gapLabel`,
   * which each label something; this labels nothing, it *is* the thing.
   */
  @words
  @property()
  format = '{from}-{to} of {total}'

  /**
   * The locale the words and the numbers are in, as a BCP 47 tag such as
   * `de`. Empty reads the nearest `lang`, then the browser's language.
   */
  @property()
  locale = ''

  /**
   * The current page, counting from one.
   */
  @property({ converter: numberConverter('page', 1) })
  page = 1

  /**
   * How many items are on a page.
   */
  @property({ attribute: 'page-size', converter: numberConverter('page-size', 0) })
  pageSize = 0

  /**
   * How many items there are across every page.
   */
  @property({ converter: numberConverter('total', 0) })
  total = 0

  protected override render(): TemplateResult {
    /* An empty template rather than `nothing`, so the element generates a box
       with no text in it: a footer laid out as a grid keeps its column, and a
       count that appears when the total loads does not move the controls beside
       it. */
    const range = pageRange(this.page, this.pageSize, this.total)
    if (range === undefined) {
      return html``
    }
    const { from, to } = range
    return html`${formatWords(this, 'format', { from, to, total: this.total })}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-pagination-summary': HelixHeadlessPaginationSummary
  }
}
