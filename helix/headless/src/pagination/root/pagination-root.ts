import {
  customElement,
  deepActiveElement,
  fillTemplate,
  formatNumbers,
  HelixActivateEvent,
  HelixElement,
  HelixNavigateEvent,
  hostAria,
  requestChange,
} from '@fusion.dev/helix-core'
import {
  caretDoubleLeft,
  caretDoubleRight,
  caretLeft,
  caretRight,
  type HelixIcon,
} from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/** What one step control is made of, once the arithmetic is done. */
interface StepParts {
  /** Where it points, or nothing where there is nowhere to go. */
  address: string | typeof nothing
  /** The handler, which also refuses the navigation on a refused change. */
  click: (event: Event) => void
  /** The mark inside it. */
  glyph: TemplateResult
  /** Its accessible name. */
  name: string
  /** `'true'` where it is spent, for `aria-disabled` on the link form. */
  off: string | typeof nothing
  /** Whether it points off the end. */
  spent: boolean
}

/** A run of pages nobody can see, and what a gap stands over. */
interface Hidden {
  /** First page it covers. */
  from: number
  /** Last page it covers. */
  to: number
}

/** What a slot in the run holds: a page number, or the pages between two runs. */
type Slot = Hidden | number

/**
 * Fills `{page}` and `{pages}` in a template a consumer wrote.
 *
 * A template rather than a prefix, because word order is not universal and a
 * `page-label="Page"` that this glued a number onto would produce the English
 * order in every language. `href="/products?page={page}"` is the same mechanism
 * doing a second job, which is why there is one placeholder syntax and not two.
 *
 * `format` is what makes the numbers local as well as the words. It is the
 * identity for an address and an `Intl.NumberFormat` for anything a person
 * reads: a URL is machine-facing and `?page=1,234` is a different page from
 * `?page=1234`, where a label read aloud should say the number the way the
 * reader's locale says it.
 */
const fill = (
  template: string,
  page: number,
  pages: number,
  format: (value: number) => string = String,
): string => fillTemplate(template, { page: format(page), pages: format(pages) })

/**
 * @summary Controls for moving between the pages of a long set of results.
 *
 * @description
 * Set a page and a total, and the component works out which page numbers to
 * show and where the gaps go:
 * `<helix-headless-pagination page="4" pages="12">`. You do not slot a child
 * for each page.
 *
 * The width stays the same as you page. The run around the current page is
 * `siblings` on each side and grows to absorb a gap at either end, so the
 * control shows the same number of slots from the first page to the last, and
 * the buttons do not move under the pointer.
 *
 * A gap appears only where it hides more than one page. A gap is a control: it
 * goes to the middle of the pages it hides, so any page is a few presses away.
 *
 * Set `href` to render every page as an `<a>`, with `{page}` replaced by the
 * page number. The links can be crawled, a middle click opens a tab, and the
 * address bar holds the state. Without `href` the pages are buttons, for a
 * table that pages in place. Either way, a click dispatches `helix-navigate`
 * first. Call `preventDefault()` to stop both the navigation and the page
 * change, for example to hand navigation to a router. There is no
 * `helix-change`, because moving to another page selects nothing.
 *
 * `Pagination.Summary` and `Pagination.Size` are separate elements that you
 * place beside this one, so you choose where they go and in what order.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Pager, Page nav
 * @documentation https://fusion.dev/helix/components/pagination
 *
 * @slot first-icon - The glyph on the jump-to-first control, usually a double caret.
 * @slot last-icon - The glyph on the jump-to-last control, usually a double caret.
 * @slot next-icon - The glyph on the forward-one-page control, usually a caret.
 * @slot previous-icon - The glyph on the back-one-page control, usually a caret.
 *
 * @event {HelixActivateEvent} helix-activate - Fired after the page changes, with the new page as a string in `detail.value`. In `href` mode it comes a task after the click, once the page has moved.
 * @event {HelixNavigateEvent} helix-navigate - Fired before the page changes, and cancelable. Canceling it is the only way to stop a page change. `detail.page` is the page asked for, as a number, and `detail.value` is the same page as a string.
 *
 * @csspart first - The control that jumps to the first page, under `ends`.
 * @csspart gap - The control in place of hidden pages, which jumps into them.
 * @csspart item - One slot in the run, holding a page or a gap.
 * @csspart last - The control that jumps to the last page, under `ends`.
 * @csspart list - The run of pages.
 * @csspart live - The live region that announces a page change. It is clipped out of view and still read.
 * @csspart mark - The glyph on a first, previous, next, or last control, where none is slotted.
 * @csspart next - The control that moves forward one page.
 * @csspart page - The control for one page.
 * @csspart page-current - The page you are on, beside `page`.
 * @csspart previous - The control that moves back one page.
 * @csspart status - The text that says which page you are on, in `compact`.
 *
 * @cssstate empty - There is one page or none, so there is nothing to page through.
 */
@customElement('helix-headless-pagination')
export class HelixHeadlessPagination extends HelixElement {
  /**
   * How many pages to show at each end, whatever the current one is.
   */
  @property({ type: Number })
  boundaries = 1

  /**
   * Replaces the page numbers with the current page and the page count, as
   * written by `status-label`.
   *
   * A different structure rather than a different look, which is why it is
   * here: the run of pages is gone and a single status line stands in its
   * place. This is the shape a narrow screen wants, and the only shape possible
   * where the total is large enough that no window over it is useful.
   *
   * Not reflected, for the reason `ends` is not: it decides what renders, so
   * nothing has to select on it.
   */
  @property({ type: Boolean })
  compact = false

  /**
   * The page to open on when `page` is not set.
   */
  @property({ attribute: 'default-page', type: Number })
  defaultPage = 1

  /**
   * Shows controls that jump to the first and last pages.
   *
   * Off by default. The gaps already reach any page in a few presses and the
   * last page is one of the two the run always shows, so on a short set these
   * are two more controls for a move already on screen. They earn their place
   * where the reader is deep in a long result and "back to the start" is the
   * move they actually want.
   *
   * Not reflected. It adds two elements rather than changing how any of them
   * look, so no rule selects on it, and the house rule is that reflection
   * exists for selectors: an unread reflected attribute is one more thing
   * written onto a host at upgrade that a server's output never had.
   */
  @property({ type: Boolean })
  ends = false

  /**
   * Accessible name for the control that jumps to the first page.
   */
  @property({ attribute: 'first-label' })
  firstLabel = 'First page'

  /**
   * Accessible name for a gap. `{page}` is replaced with the page it jumps to.
   */
  @property({ attribute: 'gap-label' })
  gapLabel = 'Skip to page {page}'

  /**
   * The URL for each page. `{page}` is replaced with the page number.
   *
   * Absent renders buttons. Present renders links, which is what a paged result
   * with its own URL should be: a crawler follows them, a middle click opens
   * one, and the back button works without the consumer wiring anything.
   */
  @property()
  href = ''

  /**
   * Accessible name for the navigation landmark.
   */
  @property()
  label = 'Pagination'

  /**
   * Accessible name for the control that jumps to the last page.
   */
  @property({ attribute: 'last-label' })
  lastLabel = 'Last page'

  /**
   * Locale for the page numbers. Absent uses the runtime's own.
   *
   * The same property the calendar takes, doing the same job one layer down:
   * the templates make the *words* the consumer's, and this makes the *numbers*
   * theirs. A page number is a number like any other, so `1234` is `1,234` in
   * `en-US`, `1.234` in `de-DE` and `١٢٣٤` in `ar-EG`, and a component that
   * lets a consumer translate "Page {page} of {pages}" and then prints Latin
   * digits into it has done half the job.
   *
   * Not applied to `href`. That one is machine-facing, and `?page=1,234` is a
   * different address from `?page=1234`.
   */
  @property()
  locale = ''

  /**
   * Accessible name for the control that moves forward.
   */
  @property({ attribute: 'next-label' })
  nextLabel = 'Next page'

  /**
   * The current page, counting from one.
   *
   * An accessor pair, the same shape as the calendar's `month`. Reading gives
   * the page on show; writing sets it, and `default-page` seeds one the element
   * keeps until somebody does.
   *
   * **Clamped on the way out, because "the page on show" is what it says it
   * gives.** Returning whatever was written means `default-page="99"` on a
   * ten-page result renders page 10, marks page 10 with `aria-current`, and
   * reports 99, so a consumer syncing their query from this reads a page that
   * does not exist while the control in front of them says otherwise. Not a
   * far-fetched value: it is a bookmarked link after the result shrank.
   *
   * Rounded here too, so `2.7` reads as the 2 it renders.
   */
  @property({ type: Number })
  get page(): number {
    const asked = this.pageState ?? this.defaultPage
    return Math.min(this.count, Math.max(1, Math.floor(asked) || 1))
  }

  set page(next: number) {
    const previous = this.page
    this.pageState = next
    this.requestUpdate('page', previous)
  }

  /**
   * Accessible name for one page. `{page}` and `{pages}` are replaced with the
   * page number and the page count.
   */
  @property({ attribute: 'page-label' })
  pageLabel = 'Page {page}'

  /**
   * How many pages there are in total.
   *
   * Clamped to at least one wherever it is read, so a result that has not
   * loaded yet renders a single page rather than an empty control that then
   * appears and pushes the layout down.
   *
   * Left unset where `total` and `page-size` are both given, since the two of
   * them already say it. A fallback rather than an override: writing this wins,
   * so there is never a question of which of two sources is current.
   */
  @property({ type: Number })
  pages = 0

  /**
   * How many items are on a page.
   *
   * Only arithmetic: this does not slice anything, because the component never
   * sees the items. It is what turns `total` into a page count, and nothing
   * else.
   */
  @property({ attribute: 'page-size', type: Number })
  pageSize = 0

  /**
   * Accessible name for the control that moves back.
   */
  @property({ attribute: 'previous-label' })
  previousLabel = 'Previous page'

  /**
   * How many pages to show either side of the current one.
   */
  @property({ type: Number })
  siblings = 1

  /**
   * The text shown in `compact`. `{page}` and `{pages}` are replaced with the
   * current page and the page count.
   *
   * No noun: the landmark this sits in is already named "Pagination", so
   * "Page 7 of 24" says it twice to a screen reader and takes a third of the
   * width from a control whose whole reason for existing is that the row is
   * narrow. The numbers are the reading.
   */
  @property({ attribute: 'status-label' })
  statusLabel = '{page} of {pages}'

  /**
   * How many items there are across every page.
   *
   * What `pages` falls back to together with `page-size`. Unset is the common
   * case, where a consumer knows the page total and not the item total.
   *
   * Nothing is rendered from it. `Pagination.Summary` is what reads a total out
   * to a reader, and takes its own.
   */
  @property({ type: Number })
  total = 0

  /**
   * What the live region says, and nothing until the page has moved once.
   *
   * `pageLabel` rather than a template of its own, so the announcement is the
   * same sentence the control the reader just pressed already carried, and
   * there is not a ninth string to translate for the sake of one of them.
   */
  @state()
  private announcement = ''

  /** The page last announced, so the first render announces nothing. */
  private announced: number | undefined = undefined

  /** The page on show, whoever set it, and `undefined` until somebody has. */
  private pageState: number | undefined = undefined

  /**
   * The control a reader just used, while it held focus, and whether it was a
   * gap. Read once by the update that follows, which decides where focus goes.
   */
  private used: { control: HTMLElement; gap: boolean } | undefined = undefined

  /** Held across every component asking for the same locale. */
  private get numbers(): (value: number) => string {
    return formatNumbers(this.locale)
  }

  /**
   * How many pages, clamped once, so every reader agrees on it.
   *
   * `pages` first, because writing it is the explicit answer. Then `total` over
   * `pageSize`, which is the same fact stated the other way round and is what a
   * consumer holding a result set already has. Then one, so a result that has
   * not loaded renders a single page rather than an empty control that appears
   * later and pushes the layout down.
   */
  private get count(): number {
    if (this.pages > 0) {
      return Math.max(1, Math.floor(this.pages))
    }
    if (this.total > 0 && this.pageSize > 0) {
      return Math.max(1, Math.ceil(this.total / this.pageSize))
    }
    return 1
  }

  /** The page on show, which `page` has already clamped. */
  private get current(): number {
    return this.page
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
    const total = this.count
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

    /* A gap carries the run it stands over rather than being a bare marker,
       because it is a control now and a control has to say where it goes. */
    const gap = (from: number, to: number): Hidden => ({ from, to })

    if (!before) {
      const head = most - boundaries - 1
      return [
        ...range(1, head),
        gap(head + 1, total - boundaries),
        ...range(total - boundaries + 1, total),
      ]
    }
    if (!after) {
      const tail = total - (most - boundaries - 2)
      return [...range(1, boundaries), gap(boundaries + 1, tail - 1), ...range(tail, total)]
    }
    return [
      ...range(1, boundaries),
      gap(boundaries + 1, current - siblings - 1),
      ...range(current - siblings, current + siblings),
      gap(current + siblings + 1, total - boundaries),
      ...range(total - boundaries + 1, total),
    ]
  }

  /**
   * Asks to move, and reports whether the request stood.
   *
   * Announced before it is applied, so `preventDefault()` is a refusal and
   * nothing moves. A consumer who holds the page refuses it and assigns their
   * own.
   */
  private request(next: number): boolean {
    if (next === this.current || next < 1 || next > this.count) {
      return false
    }
    return requestChange({
      apply: (page) => {
        /* **A link is followed after this click, so in `href` mode the change
           waits a task.** The page would otherwise re-render in the microtask
           after the click listener, before the browser reads the `href` of the
           link that was clicked, and the browser would follow whatever that link
           now points at: Next from page 5 went to page 7. A task is after the
           browser has read it. */
        if (this.href) {
          setTimeout(() => this.applyPage(page))
          return
        }
        this.applyPage(page)
      },
      event: (page) => new HelixNavigateEvent({ page, value: String(page) }),
      host: this,
      next,
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
  private readonly go = (next: number, event: Event, gap = false): void => {
    const control = event.currentTarget as HTMLElement | null
    if (!this.request(next)) {
      event.preventDefault()
      return
    }
    if (control && deepActiveElement() === control) {
      this.used = { control, gap }
    }
  }

  private applyPage(page: number): void {
    const previous = this.page
    this.pageState = page
    this.requestUpdate('page', previous)
    /* The notification after the request, the one a set sends once a
       different member is current: `helix-navigate` is a proposal another
       listener may refuse, so it cannot tell a consumer where the reader is. */
    this.dispatchEvent(new HelixActivateEvent({ value: String(page) }))
  }

  /**
   * Puts focus back in the row after the control a reader used has gone.
   *
   * A page keeps its own control across a move, because the run is keyed by
   * page, so focus stays on the page that was chosen. A gap points somewhere
   * new once the run moves, and a step control is disabled at the end it
   * reached, so after either of those focus goes to the current page, or in
   * `compact` to the first step control that can still be used. Left alone,
   * focus fell to the top of the document.
   */
  private restoreFocus(): void {
    const used = this.used
    this.used = undefined
    if (!used) {
      return
    }
    const { control, gap } = used
    const usable = (element: Element | null): element is HTMLElement =>
      element instanceof HTMLElement &&
      element.isConnected &&
      !(element as HTMLButtonElement).disabled &&
      element.getAttribute('aria-disabled') !== 'true'
    if (!gap && usable(control)) {
      return
    }
    const target = [
      this.renderRoot.querySelector('[part~="page-current"]'),
      ...['previous', 'next', 'first', 'last'].map((name) =>
        this.renderRoot.querySelector(`[part="${name}"]`),
      ),
    ].find(usable)
    target?.focus()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* On the host through internals, so the landmark is the element itself. A
       page may hold more than one navigation and landmarks are how a
       screen-reader user chooses between them, which is why this carries a
       default name at all: an author's own `aria-label` is an attribute and
       beats internals, so naming it here costs them nothing. */
    hostAria(this.internals, { label: this.label, role: 'navigation' })

    /* Through `toggleState`, which carries the feature test: an engine without
       `CustomStateSet` gets a control that renders its one page instead of
       disappearing, which is degraded rather than broken. */
    this.toggleState('empty', this.count <= 1)
  }

  /**
   * Says where the reader now is, once they have moved.
   *
   * In `updated` rather than in `request`, so it covers every path a page moves
   * by: a consumer assigning `page` reaches no request at all, and a reader who
   * got there that way deserves the same sentence.
   */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.restoreFocus()
    if (this.announced === undefined) {
      // The first render establishes where we started. Arriving is not moving.
      this.announced = this.page
      return
    }
    if (this.announced !== this.page) {
      this.announced = this.page
      this.announcement = fill(this.pageLabel, this.page, this.count, this.numbers)
    }
  }

  /**
   * One page, as a link or a button.
   *
   * `aria-current="page"` is what says which one you are on, and it stays a
   * control rather than becoming text: a reader who tabs into the run and finds
   * the current page missing from it has lost the only landmark in the row.
   * `page-current` says the same to a stylesheet, which the attribute cannot:
   * nothing can follow `::part()` to read it.
   */
  private renderPage(page: number): TemplateResult {
    const current = page === this.current
    const shown = this.numbers(page)
    const name = fill(this.pageLabel, page, this.count, this.numbers)
    return html`<li part="item">
      ${
        this.href
          ? html`<a
              part="page${current ? ' page-current' : ''}"
              href=${fill(this.href, page, this.count)}
              aria-current=${current ? 'page' : nothing}
              aria-label=${name}
              @click=${(event: Event) => this.go(page, event)}
              >${shown}</a
            >`
          : html`<button
              part="page${current ? ' page-current' : ''}"
              type="button"
              aria-current=${current ? 'page' : nothing}
              aria-label=${name}
              @click=${(event: Event) => this.go(page, event)}
            >
              ${shown}
            </button>`
      }
    </li>`
  }

  /**
   * A gap, which is a control and not a mark.
   *
   * **It goes to the middle of what it hides**, and the label says so. That is
   * the binary-search step, so an arbitrary page in a set of any size is a
   * handful of presses: 128 pages is `1 … 96 97 98 … 128`, and the leading gap
   * lands on 48, whose gaps land on 24 and 88, and so on. A jump of a fixed size
   * would need forty presses on that set.
   *
   * **A menu over these pages was the other idea and it does not survive the
   * arithmetic.** The run a gap covers is unbounded by construction: two pages
   * on a twelve-page set, ninety-four on a hundred-and-twenty-eight-page one. A
   * menu is pleasant at the first and is a scroll of ninety-four items at the
   * second, which is worse than the ellipsis it replaced, and there is no total
   * at which it stops being possible. It would also make `Pagination` depend on
   * `Menu` and `Popover` for a case a button already covers.
   *
   * So it is announced rather than hidden: a control a reader can reach has to
   * be in the tree, and the label naming its destination is the whole
   * affordance.
   */
  private renderGap(hidden: Hidden): TemplateResult {
    const to = Math.round((hidden.from + hidden.to) / 2)
    const name = fill(this.gapLabel, to, this.count, this.numbers)
    return html`<li part="item">
      ${
        this.href
          ? html`<a
              part="gap"
              href=${fill(this.href, to, this.count)}
              aria-label=${name}
              @click=${(event: Event) => this.go(to, event, true)}
              >&hellip;</a
            >`
          : html`<button
              part="gap"
              type="button"
              aria-label=${name}
              @click=${(event: Event) => this.go(to, event, true)}
            >
              &hellip;
            </button>`
      }
    </li>`
  }

  /**
   * Everything a step needs, computed once, so the markup below is only markup.
   *
   * Split out because the part name has to be a literal. A part name is read
   * from the source, so a computed one is a part nothing can see: nothing pairs it with its `@csspart` and a later rename takes
   * the promise silently. With four controls and two shapes each that is eight
   * literals, and eight copies of the arithmetic behind them would be the
   * actual duplication. This is the arithmetic, written once.
   */
  private step(to: number, spent: boolean, icon: HelixIcon, name: string): StepParts {
    return {
      address: spent ? nothing : fill(this.href, to, this.count),
      click: (event: Event): void => this.go(to, event),
      glyph: html`<svg part="mark" data-mirror fill="currentColor" viewBox=${icon.viewBox} aria-hidden="true">
        ${unsafeSVG(icon.content)}
      </svg>`,
      name,
      off: spent ? 'true' : nothing,
      spent,
    }
  }

  /**
   * The four controls, inert at the end each points at.
   *
   * Inert rather than absent: a control that disappears at the first page takes
   * the row's width with it and moves everything else under the pointer. In
   * link mode the inert one is an `<a>` with no `href`, which is not a link and
   * is not focusable, and is the platform's own way of saying there is nowhere
   * to go.
   *
   * **Each glyph is a slot fallback, and each method is a seam**, which answer
   * two different people: the slot is how a page swaps a caret for its own icon
   * set, and `protected` is how the tier above swaps all four without
   * reimplementing a template that renders eight controls across two shapes.
   * `Select` and `Listbox` carry the same pairing on one mark each.
   *
   * **Four slot names rather than one**, even though the four controls draw
   * from the same shared `mark` part. A single `<slot name="icon">` is assigned
   * once and the other three occurrences of it get nothing, so a consumer
   * replacing the caret would silently lose three of their four marks.
   */
  protected renderFirst(): TemplateResult {
    const { address, click, glyph, name, off, spent } = this.step(
      1,
      this.current <= 1,
      caretDoubleLeft,
      this.firstLabel,
    )
    const mark = html`<slot name="first-icon">${glyph}</slot>`
    return this.href
      ? html`<a part="first" href=${address} aria-disabled=${off} aria-label=${name} @click=${click}
          >${mark}</a
        >`
      : html`<button part="first" type="button" ?disabled=${spent} aria-label=${name} @click=${click}>
          ${mark}
        </button>`
  }

  protected renderPrevious(): TemplateResult {
    const { address, click, glyph, name, off, spent } = this.step(
      this.current - 1,
      this.current <= 1,
      caretLeft,
      this.previousLabel,
    )
    const mark = html`<slot name="previous-icon">${glyph}</slot>`
    return this.href
      ? html`<a
          part="previous"
          href=${address}
          aria-disabled=${off}
          aria-label=${name}
          @click=${click}
          >${mark}</a
        >`
      : html`<button
          part="previous"
          type="button"
          ?disabled=${spent}
          aria-label=${name}
          @click=${click}
        >
          ${mark}
        </button>`
  }

  protected renderNext(): TemplateResult {
    const { address, click, glyph, name, off, spent } = this.step(
      this.current + 1,
      this.current >= this.count,
      caretRight,
      this.nextLabel,
    )
    const mark = html`<slot name="next-icon">${glyph}</slot>`
    return this.href
      ? html`<a part="next" href=${address} aria-disabled=${off} aria-label=${name} @click=${click}
          >${mark}</a
        >`
      : html`<button part="next" type="button" ?disabled=${spent} aria-label=${name} @click=${click}>
          ${mark}
        </button>`
  }

  protected renderLast(): TemplateResult {
    const { address, click, glyph, name, off, spent } = this.step(
      this.count,
      this.current >= this.count,
      caretDoubleRight,
      this.lastLabel,
    )
    const mark = html`<slot name="last-icon">${glyph}</slot>`
    return this.href
      ? html`<a part="last" href=${address} aria-disabled=${off} aria-label=${name} @click=${click}
          >${mark}</a
        >`
      : html`<button part="last" type="button" ?disabled=${spent} aria-label=${name} @click=${click}>
          ${mark}
        </button>`
  }

  protected override render(): TemplateResult {
    if (this.compact) {
      return html`${this.ends ? this.renderFirst() : nothing}${this.renderPrevious()}
        <span part="status"
          >${fill(this.statusLabel, this.current, this.count, this.numbers)}</span
        >
        ${this.renderNext()}${this.ends ? this.renderLast() : nothing}${this.renderLive()}`
    }
    return html`${this.ends ? this.renderFirst() : nothing}${this.renderPrevious()}
      <ol part="list" role="list">
        ${
          /* Keyed by page, so a page's control stays that page's as the run
             moves under it, and a reader who chose page 5 is still on page 5.
             By position, the focused button took the next page's number. A gap
             is keyed by its side of the current page. */
          repeat(
            this.slots,
            (slot) =>
              typeof slot === 'number'
                ? slot
                : slot.from < this.current
                  ? 'gap-before'
                  : 'gap-after',
            (slot) => (typeof slot === 'number' ? this.renderPage(slot) : this.renderGap(slot)),
          )
        }
      </ol>
      ${this.renderNext()}${this.ends ? this.renderLast() : nothing}${this.renderLive()}`
  }

  /**
   * The region that says the page moved.
   *
   * Always rendered and empty until it has something to say. A live region
   * populated at the moment it enters the document announces itself on arrival,
   * which for a component that upgrades on load is every page load.
   */
  private renderLive(): TemplateResult {
    return html`<span part="live" role="status" aria-live="polite">${this.announcement}</span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-pagination': HelixHeadlessPagination
  }
}
