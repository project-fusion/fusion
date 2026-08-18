import {
  customElement,
  HelixElement,
  HelixNavigateEvent,
  hostAria,
  requestControlledChange,
} from '@helix-io/core'
import { caretLeft, caretRight } from '@helix-io/icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/** What a slot in the run holds: a page number, or the gap between two runs. */
type Slot = number | 'gap'

/**
 * Fills `{page}` and `{pages}` in a template a consumer wrote.
 *
 * A template rather than a prefix, because word order is not universal and a
 * `page-label="Page"` that this glued a number onto would produce the English
 * order in every language. `href="/products?page={page}"` is the same mechanism
 * doing a second job, which is why there is one placeholder syntax and not two.
 */
const fill = (template: string, page: number, pages: number): string =>
  template.replaceAll('{page}', String(page)).replaceAll('{pages}', String(pages))

/**
 * @summary Moves between pages of a longer result.
 *
 * @description
 * The component is the truncation. Given a page and a total it works out which
 * numbers to show and where the runs break, which is the whole of what a
 * consumer would otherwise write by hand and get subtly wrong; everything else
 * here is markup around that. So this is data-driven rather than composed:
 * `<helix-pagination page="4" pages="12">` rather than twelve slotted children
 * a consumer has to keep in step with their own query.
 *
 * **The width does not change as you page.** The run around the current page is
 * `siblings` either side normally, and grows to absorb a gap slot when it meets
 * a boundary, so the control holds the same number of slots from the first page
 * to the last. Every arrangement that lets the count vary makes the buttons move
 * under the pointer between one click and the next.
 *
 * **A gap is only drawn where it hides more than one page.** An ellipsis
 * standing in for a single number costs the same space as the number and tells
 * the reader less.
 *
 * **`href` is what makes these links.** Set it and every page renders an `<a>`
 * with `{page}` filled in, so the server's output is crawlable, a middle click
 * opens a tab, and the address bar is the state. Left unset they are buttons,
 * which is right for a table paging in place. Either way the click announces
 * `helix-navigate` first, and `preventDefault()` on it stops the navigation as
 * well as the change: that is how a router takes over without the page reloading
 * underneath it.
 *
 * **`helix-navigate` and not `helix-change`**, for the reason the calendar pages
 * with it too. Moving to page four chooses nothing; it moves the view over a
 * result that has not changed. A consumer driving the view has to be able to
 * hear that without being told an answer changed.
 *
 * `page` is the controlled property and `default-page` seeds one the element
 * owns. Naming `page` is a claim of ownership: the element announces and waits
 * to be told, which is what a consumer paging through a router already wants.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Pager, Page nav
 * @documentation https://helix.fusion.dev/components/pagination
 *
 * @csspart list - The run of pages.
 * @csspart item - One slot in the run, holding a page or a gap.
 * @csspart page - The control for one page.
 * @csspart gap - The mark standing in for pages not shown.
 * @csspart previous - The control that moves back one page.
 * @csspart next - The control that moves forward one page.
 * @csspart status - The reading of where you are, in `compact`.
 *
 * @event {HelixNavigateEvent} helix-navigate - Fired before the page changes, and cancelable. The only way to refuse one.
 */
@customElement('helix-base-pagination')
export class HelixBasePagination extends HelixElement {
  /**
   * How many pages there are in total.
   *
   * Clamped to at least one wherever it is read, so a result that has not
   * loaded yet renders a single page rather than an empty control that then
   * appears and pushes the layout down.
   */
  @property({ type: Number })
  pages = 1

  /**
   * The page on show, one-based.
   *
   * An accessor pair, the same shape as the calendar's `month`. Reading gives
   * the page on show; writing declares it the consumer's, and `default-page`
   * seeds one the element owns.
   */
  @property({ type: Number })
  get page(): number {
    return this.pageState ?? this.defaultPage
  }

  set page(next: number) {
    const previous = this.page
    this.pageState = next
    this.requestUpdate('page', previous)
  }

  /** Page to open on, where nothing declared one. */
  @property({ attribute: 'default-page', type: Number })
  defaultPage = 1

  /** How many pages to show either side of the current one. */
  @property({ type: Number })
  siblings = 1

  /** How many pages to show at each end, whatever the current one is. */
  @property({ type: Number })
  boundaries = 1

  /**
   * Address for a page, with `{page}` standing in for its number.
   *
   * Absent renders buttons. Present renders links, which is what a paged result
   * with its own URL should be: a crawler follows them, a middle click opens
   * one, and the back button works without the consumer wiring anything.
   */
  @property()
  href = ''

  /**
   * Where the numbers are replaced by a reading of the two.
   *
   * A different structure rather than a different look, which is why it is
   * here: the run of pages is gone and a single status line stands in its
   * place. This is the shape a narrow screen wants, and the only shape possible
   * where the total is large enough that no window over it is useful.
   */
  @property({ reflect: true, type: Boolean })
  compact = false

  /** Accessible name for the navigation landmark. */
  @property()
  label = 'Pagination'

  /** Accessible name for one page, with `{page}` and `{pages}` filled in. */
  @property({ attribute: 'page-label' })
  pageLabel = 'Page {page}'

  /** The reading shown in `compact`, with `{page}` and `{pages}` filled in. */
  @property({ attribute: 'status-label' })
  statusLabel = 'Page {page} of {pages}'

  /** Accessible name for the control that moves back. */
  @property({ attribute: 'previous-label' })
  previousLabel = 'Previous page'

  /** Accessible name for the control that moves forward. */
  @property({ attribute: 'next-label' })
  nextLabel = 'Next page'

  /** The page on show, whoever set it, and `undefined` until somebody has. */
  private pageState: number | undefined = undefined

  /** Whether the consumer owns the page, decided once and then fixed. */
  private pageMode: boolean | undefined = undefined

  private get pageIsControlled(): boolean {
    return this.pageMode === true
  }

  /** The total, clamped once, so every reader agrees on it. */
  private get total(): number {
    return Math.max(1, Math.floor(this.pages) || 1)
  }

  /** The page on show, clamped into the total. */
  private get current(): number {
    return Math.min(this.total, Math.max(1, Math.floor(this.page) || 1))
  }

  /**
   * Which pages to show, and where the runs break.
   *
   * `most` is the number of slots the control holds at its widest: both
   * boundaries, the run around the current page, and a gap on each side. Below
   * that there is nothing to hide, and the whole range is shown.
   *
   * Above it, the two gaps are decided independently, and a gap standing over
   * exactly one page is not drawn: `boundaries + 2` is the first page whose
   * predecessor is not a boundary, so a run starting there is contiguous with
   * what precedes it. Where one side has no gap the run on that side extends to
   * `most` slots, which is what holds the width still.
   */
  private get slots(): Slot[] {
    const total = this.total
    const current = this.current
    const boundaries = Math.max(0, Math.floor(this.boundaries) || 0)
    const siblings = Math.max(0, Math.floor(this.siblings) || 0)
    const run = 2 * siblings + 1
    const most = 2 * boundaries + run + 2

    const range = (from: number, to: number): number[] =>
      Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => from + index)

    if (total <= most) {
      return range(1, total)
    }

    const before = current - siblings > boundaries + 2
    const after = current + siblings < total - boundaries - 1

    if (!before) {
      return [...range(1, most - boundaries - 1), 'gap', ...range(total - boundaries + 1, total)]
    }
    if (!after) {
      return [...range(1, boundaries), 'gap', ...range(total - (most - boundaries - 2), total)]
    }
    return [
      ...range(1, boundaries),
      'gap',
      ...range(current - siblings, current + siblings),
      'gap',
      ...range(total - boundaries + 1, total),
    ]
  }

  /**
   * Asks to move, and reports whether the request stood.
   *
   * Announced before it is applied, so `preventDefault()` is a refusal and
   * nothing moves. In controlled mode nothing is written whatever the answer:
   * the consumer holds the page and this is the element telling them a reader
   * asked for another one.
   */
  private request(next: number): boolean {
    if (next === this.current || next < 1 || next > this.total) {
      return false
    }
    return requestControlledChange({
      apply: (page) => {
        if (this.pageIsControlled) {
          return
        }
        const previous = this.page
        this.pageState = page
        this.requestUpdate('page', previous)
      },
      controlled: this.pageIsControlled,
      event: (page) => new HelixNavigateEvent({ value: String(page) }),
      host: this,
      label: 'page',
      next,
      read: () => this.current,
    })
  }

  /**
   * The click handler, which is also what stops a link from following itself.
   *
   * A refused change has to refuse the navigation with it, or a router that
   * cancels the event still loses the document underneath it. `preventDefault`
   * on a button's click does nothing and costs nothing, so this is one handler
   * for both shapes rather than two that have to stay in step.
   */
  private readonly go = (next: number, event: Event): void => {
    if (!this.request(next)) {
      event.preventDefault()
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // Only the first time, before anything reads it. See `MixinControllerOpen`.
    if (this.pageMode === undefined) {
      this.pageMode = this.pageState !== undefined
    }
    /* On the host through internals, so the landmark is the element itself. A
       page may hold more than one navigation and landmarks are how a
       screen-reader user chooses between them, which is why this carries a
       default name at all: an author's own `aria-label` is an attribute and
       beats internals, so naming it here costs them nothing. */
    hostAria(this.internals, { label: this.label, role: 'navigation' })
  }

  /**
   * One page, as a link or a button.
   *
   * `aria-current="page"` is what says which one you are on, and it stays a
   * control rather than becoming text: a reader who tabs into the run and finds
   * the current page missing from it has lost the only landmark in the row.
   */
  private renderPage(page: number): TemplateResult {
    const current = page === this.current
    return html`<li part="item">
      ${
        this.href
          ? html`<a
              part="page"
              href=${fill(this.href, page, this.total)}
              aria-current=${current ? 'page' : nothing}
              aria-label=${fill(this.pageLabel, page, this.total)}
              @click=${(event: Event) => this.go(page, event)}
              >${page}</a
            >`
          : html`<button
              part="page"
              type="button"
              aria-current=${current ? 'page' : nothing}
              aria-label=${fill(this.pageLabel, page, this.total)}
              @click=${(event: Event) => this.go(page, event)}
            >
              ${page}
            </button>`
      }
    </li>`
  }

  /**
   * Previous or next, inert at the end it points at.
   *
   * Inert rather than absent: a control that disappears at the first page takes
   * the row's width with it and moves everything else under the pointer. In
   * link mode the inert one is an `<a>` with no `href`, which is not a link and
   * is not focusable, and is the platform's own way of saying there is nowhere
   * to go.
   */
  private renderStep(back: boolean): TemplateResult {
    const to = this.current + (back ? -1 : 1)
    const spent = back ? this.current <= 1 : this.current >= this.total
    const icon = back ? caretLeft : caretRight
    const name = back ? this.previousLabel : this.nextLabel
    const glyph = html`<svg fill="currentColor" viewBox=${icon.viewBox} aria-hidden="true">
      ${unsafeSVG(icon.content)}
    </svg>`
    const click = (event: Event): void => this.go(to, event)
    const address = spent ? nothing : fill(this.href, to, this.total)
    const off = spent ? 'true' : nothing

    /* The part name is written out rather than interpolated, and one
       `part=${…}` would have covered all four of these. `check:parts` reads
       `part="name"` out of the source, so a computed one is a part the tooling
       cannot see: it is not in the manifest's reach, nothing pairs it with its
       `@csspart`, and a later rename takes the promise with it silently. Four
       literals cost four lines and are greppable. */
    if (this.href) {
      return back
        ? html`<a
            part="previous"
            href=${address}
            aria-disabled=${off}
            aria-label=${name}
            @click=${click}
            >${glyph}</a
          >`
        : html`<a part="next" href=${address} aria-disabled=${off} aria-label=${name} @click=${click}
            >${glyph}</a
          >`
    }
    return back
      ? html`<button part="previous" type="button" ?disabled=${spent} aria-label=${name} @click=${click}>
          ${glyph}
        </button>`
      : html`<button part="next" type="button" ?disabled=${spent} aria-label=${name} @click=${click}>
          ${glyph}
        </button>`
  }

  protected override render(): TemplateResult {
    if (this.compact) {
      return html`${this.renderStep(true)}
        <span part="status">${fill(this.statusLabel, this.current, this.total)}</span>
        ${this.renderStep(false)}`
    }
    return html`${this.renderStep(true)}
      <ol part="list" role="list">
        ${this.slots.map((slot) =>
          slot === 'gap'
            ? /* The whole item is out of the tree, not just the mark inside it.
                 An `aria-hidden` span in a listed item leaves an item with
                 nothing in it, announced as blank; hidden outright, the list's
                 count is the pages a reader can actually reach. Nothing is lost
                 by it: a jump from 3 to 11 is audible from the two labels
                 either side, and the ellipsis is how that gap is drawn. */
              html`<li part="item" aria-hidden="true">
                <span part="gap">&hellip;</span>
              </li>`
            : this.renderPage(slot),
        )}
      </ol>
      ${this.renderStep(false)}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-pagination': HelixBasePagination
  }
}
