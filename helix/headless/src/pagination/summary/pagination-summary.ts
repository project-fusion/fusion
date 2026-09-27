import { customElement, fillTemplate, formatNumbers, HelixElement } from '@fusion.dev/helix-core'
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
   * The text shown. `{from}`, `{to}`, and `{total}` are replaced with the first
   * item, the last item, and the item count.
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
  @property()
  format = '{from}-{to} of {total}'

  /**
   * Locale for the numbers.
   *
   * Absent uses the runtime's own.
   */
  @property()
  locale = ''

  /**
   * The current page, counting from one.
   */
  @property({ type: Number })
  page = 1

  /**
   * How many items are on a page.
   */
  @property({ attribute: 'page-size', type: Number })
  pageSize = 0

  /**
   * How many items there are across every page.
   */
  @property({ type: Number })
  total = 0

  /** Held across every component asking for the same locale. */
  private get numbers(): (value: number) => string {
    return formatNumbers(this.locale)
  }

  protected override render(): TemplateResult {
    /* An empty template rather than `nothing`, so the element generates a box
       with no text in it: a footer laid out as a grid keeps its column, and a
       count that appears when the total loads does not move the controls beside
       it. */
    if (this.total <= 0 || this.pageSize <= 0) {
      return html``
    }
    const size = Math.max(1, Math.floor(this.pageSize))
    /* **The page is clamped to the range, not just the window inside it.**
       Only the end was, so a `page` past the last one produced a start past the
       total and an end pinned to it: at page 99 of a 10-page result this read
       "2,451-248 of 248", a range running backwards. That is the worst kind of
       wrong here, because a count is the one number in a footer a reader cannot
       check against anything else on screen.
    
       A page past the end is not far-fetched either: it is a bookmarked query
       after the result shrank, and the run beside this clamps it silently, so
       the two would disagree with only this one visibly broken. */
    const pages = Math.max(1, Math.ceil(this.total / size))
    const page = Math.min(pages, Math.max(1, Math.floor(this.page) || 1))
    const from = (page - 1) * size + 1
    /* And the end is clamped to the total, because the last page is rarely
       full: 248 items at 25 a page end at 248, not at 250. */
    const to = Math.min(this.total, from + size - 1)
    return html`${fillTemplate(this.format, {
      from: this.numbers(from),
      to: this.numbers(to),
      total: this.numbers(this.total),
    })}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-pagination-summary': HelixHeadlessPaginationSummary
  }
}
