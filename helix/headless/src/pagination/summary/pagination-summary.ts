import { customElement, HelixElement } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Reads out which items of how many are on show.
 *
 * @description
 * Its own element rather than a part of `Pagination`, so a consumer decides
 * where it goes. Inside the run it could only ever be at one end of one row;
 * beside it, it goes above, below, in a table's caption, or on the other side of
 * the page, and the direction and order of the whole footer are the consumer's.
 *
 * **It repeats `page`, `page-size` and `total`, and that is not drift.** Those
 * three come from the consumer's own query, so writing them on two elements is
 * one variable used twice, which is how a framework consumer writes everything.
 * The alternative is a coordinating root that feeds its slotted children, and
 * the only ways to do that here are writing attributes onto elements the
 * consumer rendered, which this library refuses because a framework reports the
 * difference as a hydration error, or a context mechanism that does not exist.
 *
 * Renders nothing without a `total` and a `page-size`. A wrong count is worse
 * than none: it is the one number in a footer a reader cannot check against
 * anything else on screen.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Result count, Range
 * @documentation https://helix.fusion.dev/components/pagination
 */
@customElement('helix-base-pagination-summary')
export class HelixBasePaginationSummary extends HelixElement {
  /** The page on show, one-based. */
  @property({ type: Number })
  page = 1

  /** How many items are on a page. */
  @property({ attribute: 'page-size', type: Number })
  pageSize = 0

  /** How many items there are across every page. */
  @property({ type: Number })
  total = 0

  /**
   * The reading, with `{from}`, `{to}` and `{total}` filled in.
   *
   * A template rather than a prefix and a suffix, because word order is not
   * universal: `count-label="{total} 件中 {from}-{to} 件"` is one attribute here
   * and three concatenations anywhere else.
   */
  @property()
  label = '{from}-{to} of {total}'

  /** Locale for the numbers. Absent uses the runtime's own. */
  @property()
  locale = ''

  /** Built once per locale. Same reasoning as the calendar's date formatters. */
  private cachedFormat: { format: Intl.NumberFormat; locale: string } | undefined

  private get numbers(): (value: number) => string {
    if (this.cachedFormat?.locale !== this.locale) {
      this.cachedFormat = {
        format: new Intl.NumberFormat(this.locale || undefined),
        locale: this.locale,
      }
    }
    const { format } = this.cachedFormat
    return (value) => format.format(value)
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
    return html`${this.label
      .replaceAll('{from}', this.numbers(from))
      .replaceAll('{to}', this.numbers(to))
      .replaceAll('{total}', this.numbers(this.total))}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-pagination-summary': HelixBasePaginationSummary
  }
}
