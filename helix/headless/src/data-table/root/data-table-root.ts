import {
  customElement,
  HelixElement,
  HelixFilterEvent,
  HelixNavigateEvent,
  HelixSortEvent,
  hostAria,
  MixinCollection,
  requestChange,
  slotFilled,
} from '@fusion.dev/helix-core'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
/* `static-html`'s `html`, because the pagination's tag is interpolated: a
   template naming a literal `helix-pagination` renders the styled element from
   the headless tier, and `lit`'s own `html` treats `${tag}` in tag position as
   text, which renders an element called `lit$…$` that lays out as nothing.
   Measured: the styled spec read `localName` as `lit$640177303$`. */
import { html } from 'lit/static-html.js'
import type { HelixHeadlessTableColumn } from '../../table/column/table-column.js'
import '../../pagination/index.js'
import { type Axis, cycle, type DataRow, format, ordered, parse } from './order.js'

/**
 * @summary A table that owns a result: rows as data, with sort, filter and paging.
 *
 * @description
 * **The schema is markup and the data is a property.** Columns are declared as
 * `helix-table-column` children, because a schema is small, declarative, and
 * something a reader should be able to see in the HTML; rows are handed over as
 * an array, because data is large and a table that draws ten thousand elements
 * cannot window them.
 *
 * ```html
 * <helix-data-table .rows=${rows} sort="name:asc" page-size="20">
 *   <helix-table-column field="name" sortable>Name</helix-table-column>
 *   <helix-table-column field="size" align="end" sortable .cell=${bytes}>Size</helix-table-column>
 * </helix-data-table>
 * ```
 *
 * `helix-table` takes rows as markup and is the right component for a table of
 * twelve things a person wrote out.
 *
 * **Sort and filter apply to the whole set, never the page.** Sorting the drawn
 * window is correct on the first screen and wrong on every other one, which is
 * how it survives being looked at. The arithmetic lives in `order.ts` where
 * nothing can see a window, and its spec asserts the composition rather than the
 * three steps, because each step alone passes either way.
 *
 * **What it does not do, stated where a consumer will read it: the cell values
 * do not server-render.** The headings do, because a column renders its own, and
 * the row elements do, because their count comes from `rows`. Reading a cell
 * needs the columns, and the columns are markup children that Lit SSR does not
 * hand this element: `children` is undefined there. So a crawler and a reader on
 * a slow connection see a table of the right shape with nothing in it, which is
 * strictly less than `helix-table` serves for a table whose rows are markup.
 *
 * That is the cost of "the schema is markup and the data is a property". Use
 * `helix-table` where the content has to be in the served HTML and the result is
 * small enough to write out; use this where the result is large, and accept that
 * the first paint is a shell. The obvious workaround, a `columns` property
 * beside the markup columns, is deliberately not offered: it splits one source
 * of truth for the columns into two that nothing checks against each other, and
 * a table rendering one way on the server and another in the browser is that
 * failure with a hydration mismatch on top.
 *
 * **Every axis is controlled or uncontrolled, and that is what makes a server
 * mode fall out rather than be bolted on.** `sort`, `filter`, `page` and
 * `page-size` each defer to the consumer when set and seed themselves from a
 * `default-*` when not. A consumer who answers all four holds the data flow:
 * they hear the reader's request, fetch, and hand back a new `rows` with a
 * `total`. Retrofitting that inverts the flow and is a rewrite, so it is here
 * from the start.
 *
 * @since 0.1.0
 * @status experimental
 * @category data
 * @aliases Grid, Result table, Data grid
 * @documentation https://helix.fusion.dev/components/data-table
 *
 * @slot - The columns, declared as `helix-table-column` children.
 * @slot footer - Below the grid, replacing the pagination this would otherwise draw.
 * @slot toolbar - Above the grid, for a search field or actions.
 *
 * @event {HelixFilterEvent} helix-filter - Fired when the query changes, and cancelable.
 * @event {HelixNavigateEvent} helix-navigate - Fired when a reader asks for another page, and cancelable.
 * @event {HelixSortEvent} helix-sort - Fired when a reader asks for a different order, and cancelable.
 *
 * @csspart cell - One cell.
 * @csspart empty - Shown when no rows match.
 * @csspart footer - The region below the grid.
 * @csspart head - The row the column headings sit in. `display: contents`, so it takes no space.
 * @csspart loading - Shown while the rows are still on their way.
 * @csspart pagination - The pagination, where this draws one.
 * @csspart row - One row of data.
 * @csspart table - The grid.
 * @csspart toolbar - The region above the grid.
 *
 * @cssproperty --data-table-template - The column track list this element worked out from the columns declared in it. Written by the component, read by the sheet that paints: a stylesheet takes it to lay the grid out, and setting it does nothing, because the component writes it inline on the very element that reads it and an inline declaration beats any sheet. `--data-table-columns` is the one to set.
 */
@customElement('helix-headless-data-table')
export class HelixHeadlessDataTable extends MixinCollection(HelixElement) {
  /**
   * Nothing is assigned by name, so the columns can be put in a header row.
   *
   * `role="columnheader"` under `role="grid"` with no owning row is invalid, and
   * the columns are ordinary children a consumer writes with no `slot`. Manual
   * assignment is the only way to wrap them without editing the consumer's
   * markup, which is a change a React consumer's hydration reports and does not
   * patch up. The same arrangement `helix-table` arrived at, for the same reason.
   */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixElement.shadowRootOptions,
    slotAssignment: 'manual',
  }

  /**
   * Query to open with, where nothing declared one.
   */
  @property({ attribute: 'default-filter' })
  defaultFilter = ''

  /**
   * Page to open on, where nothing declared one.
   */
  @property({ attribute: 'default-page', type: Number })
  defaultPage = 1

  /**
   * Page size to open with, where nothing declared one.
   */
  @property({ attribute: 'default-page-size', type: Number })
  defaultPageSize = 0

  /**
   * Order to open on, where nothing declared one.
   */
  @property({ attribute: 'default-sort' })
  defaultSort = ''

  /**
   * The field naming a row's stable identity.
   *
   * **Needed before selection exists, not after.** Lit keys the rendered rows by
   * it, so a sort moves a row's element rather than rewriting every cell in
   * place, which is what keeps focus inside a cell and keeps a CSS transition
   * attached to the row it belongs to. Left unset the index is the key, which is
   * correct only while nothing reorders: it is why this defaults to something
   * that works and is worth setting anyway.
   */
  @property()
  key = ''

  /**
   * The order, as `field:direction`.
   *
   * Set it and this element defers: a reader's click fires `helix-sort` and
   * changes nothing until a new value arrives. `default-sort` seeds an order this
   * element then owns.
   */
  @property()
  get sort(): string {
    return this.sortState ?? this.defaultSort
  }

  set sort(next: string) {
    const previous = this.sort
    this.sortState = next
    this.requestUpdate('sort', previous)
  }

  /**
   * Accessible name for the grid.
   */
  @property()
  label = ''

  /**
   * What the rows are narrowed to, as one query across every column.
   *
   * One query rather than a predicate per column, which is what a reader means
   * by a search box above a table. It matches on each column's ordering value,
   * so search and sort cannot disagree about what a column holds.
   */
  @property()
  get filter(): string {
    return this.filterState ?? this.defaultFilter
  }

  set filter(next: string) {
    const previous = this.filter
    this.filterState = next
    this.requestUpdate('filter', previous)
  }

  /**
   * Whether this element does the work or asks the consumer to.
   *
   * `client` filters, sorts and pages `rows` itself. `server` applies none of
   * them: `rows` is the page, `total` is the size of the whole result, and the
   * three events are requests the consumer answers by fetching. Past some size
   * the client cannot hold the data, so this is not an optimization, it is the
   * only mode that works, and it is here from the start because adding it later
   * inverts the data flow.
   */
  @property()
  mode: 'client' | 'server' = 'client'

  /**
   * The page on show, from 1.
   *
   * Clamped on the way out, so what this reports is the page it drew: a
   * bookmarked link to page 99 of a result that has since shrunk reads back as
   * the last page rather than as 99.
   */
  @property({ type: Number })
  get page(): number {
    const asked = this.pageState ?? this.defaultPage
    return Math.min(this.pages, Math.max(1, Math.floor(asked) || 1))
  }

  set page(next: number) {
    const previous = this.page
    this.pageState = next
    this.requestUpdate('page', previous)
  }

  /**
   * The whole result, in the order it arrived.
   *
   * A property and not an attribute: it is an array. Left alone this element
   * filters, sorts and pages it; in `server` mode it is the page the consumer
   * already fetched and none of the three is applied.
   *
   * **Read, never written.** Sorting produces a new array rather than reordering
   * this one, because a consumer's array may be the same object their own state
   * holds and reordering it under them is a mutation they did not ask for.
   */
  @property({ attribute: false })
  rows: readonly DataRow[] = []

  /**
   * How many rows a page holds. Zero is every row, which is what "no paging" means.
   *
   * **It announces nothing, and that is not an omission.** Nothing in this
   * element ever asks for a different page size: a size selector is
   * `helix-pagination-size`, which a consumer puts in the `footer` slot and
   * answers themselves. Routing this through `requestChange` would announce an
   * event the element never has cause to fire.
   */
  @property({ attribute: 'page-size', type: Number })
  get pageSize(): number {
    return Math.max(0, Math.floor(this.pageSizeState ?? this.defaultPageSize) || 0)
  }

  set pageSize(next: number) {
    const previous = this.pageSize
    this.pageSizeState = next
    this.requestUpdate('pageSize', previous)
  }

  /**
   * How many rows the whole result has, where this element cannot count them.
   *
   * Only read in `server` mode, where `rows` is one page and its length says
   * nothing about the result. Ignored in `client` mode rather than trusted,
   * because two sources for one count is the mistake, and here the array is the
   * one that cannot be stale.
   */
  @property({ type: Number })
  total = 0

  /**
   * Whether to draw a pagination under the grid.
   *
   * On by default once a page size is set, because a paged table with no way to
   * change pages shows a reader the first twenty rows and no way to know there
   * are more. Off for a consumer supplying their own through the `footer` slot,
   * which is why the slot replaces this rather than sitting beside it.
   */
  @property({ type: Boolean })
  get paginated(): boolean {
    return this.paginatedState ?? this.pageSize > 0
  }

  set paginated(next: boolean) {
    const previous = this.paginated
    this.paginatedState = next
    this.requestUpdate('paginated', previous)
  }

  @state()
  private sortState: string | undefined = undefined

  @state()
  private filterState: string | undefined = undefined

  @state()
  private pageState: number | undefined = undefined

  @state()
  private pageSizeState: number | undefined = undefined

  @state()
  private paginatedState: boolean | undefined = undefined

  /** The columns declared as children, in the order they are written. */
  get tableColumns(): HelixHeadlessTableColumn[] {
    /* `?? []` is the server. Lit's element shim carries attributes and not a
       tree, so `children` is undefined there, and this getter is read during
       `render`: spreading it throws and takes the whole SSR suite with it. */
    return [...(this.children ?? [])].filter(
      (child): child is HelixHeadlessTableColumn =>
        'isTableColumn' in child && child.isTableColumn === true,
    )
  }

  /** The columns reduced to what the ordering needs. */
  private get axes(): Axis[] {
    return this.tableColumns
      .filter((column) => column.field !== '')
      .map((column) => ({ field: column.field, order: (row: DataRow) => column.order(row) }))
  }

  /** The track list, from the columns if there are any. */
  private get template(): string {
    const declared = this.tableColumns
    return declared.length > 0 ? declared.map((column) => column.track).join(' ') : ''
  }

  /**
   * How many rows this draws before it is worth saying something, and why 2,000.
   *
   * Measured 28 Aug 2026 on a four-column grid, mounting and painting: 100 rows
   * in 10.9ms, 500 in 30.2ms, 2,000 in 83.2ms and **5,000 rows as 20,000 cells
   * in 186ms**. It is linear at roughly 37 microseconds a row, so the 100ms an
   * interaction has to stay inside lands near 2,700 and this sits under it.
   * Sorting stays cheap throughout, 23.7ms at five thousand, so the cost is the
   * cells rather than the work over them.
   */
  private static readonly COMFORTABLE = 2_000

  /** Said once per element, so a table that re-renders does not repeat it. */
  private warnedAboutSize = false

  /**
   * Says so when a table is asked to draw more than it comfortably can.
   *
   * **The component renders every row it is given and defaults to doing so.**
   * `defaultPageSize` is `0`, so `paginated` is false unless a consumer asks,
   * which means the out-of-the-box arrangement is the unbounded one and nothing
   * about it says that a result of any size will simply be drawn.
   *
   * **Windowing was refused**, which is worth recording because it is the
   * obvious answer. This element already has two mechanisms: `paginated` with a
   * `page-size`, and `mode="server"` where `rows` is one page, `total` is the
   * whole result and `aria-rowcount` already reports the result rather than the
   * window, which is the hard half of virtualization done correctly. A third
   * would fight the first two, and virtualizing a grid means variable row
   * heights, a sticky header and keeping `aria-rowindex` honest against a result
   * the element is no longer holding. `VirtualizeController` exists for the case
   * where the rows are a flat list and this is not that.
   *
   * Warned once per element, in a browser only: a warning during a server render
   * is one nobody can act on and one that would print per request.
   */
  private warnIfCrowded(drawn: number): void {
    if (
      this.warnedAboutSize ||
      drawn <= HelixHeadlessDataTable.COMFORTABLE ||
      typeof window === 'undefined'
    ) {
      return
    }
    this.warnedAboutSize = true
    console.warn(
      `<${this.localName}> is drawing ${drawn} rows at once, which is past the ${HelixHeadlessDataTable.COMFORTABLE} ` +
        'it stays responsive to: every row is rendered, so this costs roughly 37 microseconds each and ' +
        'crosses an interaction budget around 2,700. Set `page-size` to paginate, or `mode="server"` ' +
        'to hand it one page at a time with `total` describing the whole result.',
    )
  }

  /**
   * The rows to draw, and the counts around them.
   *
   * In `server` mode this element applies nothing: `rows` is already the page,
   * `total` is the result, and both counts come from the consumer. Anything else
   * would be this element filtering a page it was handed, which narrows one
   * screen and calls it a search.
   */
  private get view(): { matched: number; rows: DataRow[]; total: number } {
    if (this.mode === 'server') {
      const total = Math.max(this.total, this.rows.length)
      return { matched: total, rows: [...this.rows], total }
    }
    const view = ordered(this.rows, this.axes, {
      page: this.page,
      query: this.filter,
      size: this.pageSize,
      spec: this.sort,
    })
    this.warnIfCrowded(view.rows.length)
    return view
  }

  /** How many pages the result makes, which is at least one even when empty. */
  private get pages(): number {
    const size = this.pageSize
    if (size <= 0) {
      return 1
    }
    const count = this.mode === 'server' ? Math.max(this.total, this.rows.length) : this.matched
    return Math.max(1, Math.ceil(count / size))
  }

  /**
   * Rows after filtering, computed without paging.
   *
   * Separate from `view` because `pages` needs it and `page` needs `pages`:
   * asking `view` for it would recurse through the clamp in `page`.
   */
  private get matched(): number {
    const query = this.filter.trim()
    if (query === '') {
      return this.rows.length
    }
    const axes = this.axes
    const needle = query.toLocaleLowerCase()
    return this.rows.filter((row) =>
      axes.some((axis) => {
        const value = axis.order(row)
        return value === null || value === undefined
          ? false
          : String(value).toLocaleLowerCase().includes(needle)
      }),
    ).length
  }

  /** Emptiness is a fact about the data here, not about slotted children. */
  protected override get hasRows(): boolean {
    return this.view.rows.length > 0
  }

  /**
   * Asks for a different order, and reports whether the request stood.
   *
   * Announced before it is applied, so `preventDefault()` is a refusal and the
   * order does not move, which is what makes a server-side sort expressible: the
   * consumer refuses the local reorder, fetches, and hands back a new set.
   */
  private requestSort(next: string): boolean {
    return requestChange({
      apply: (value) => {
        const previous = this.sort
        this.sortState = value
        this.requestUpdate('sort', previous)
      },
      event: (value) => new HelixSortEvent({ value }),
      host: this,
      next,
    })
  }

  /** Asks for a different query. */
  private requestFilter(next: string): boolean {
    return requestChange({
      apply: (value) => {
        const previous = this.filter
        this.filterState = value
        this.requestUpdate('filter', previous)
      },
      event: (value) => new HelixFilterEvent({ value }),
      host: this,
      next,
    })
  }

  /** Asks for a different page. */
  private requestPage(next: number): boolean {
    if (next === this.page || next < 1 || next > this.pages) {
      return false
    }
    return requestChange({
      apply: (value) => {
        const previous = this.page
        this.pageState = value
        this.requestUpdate('page', previous)
      },
      event: (value) => new HelixNavigateEvent({ value: String(value) }),
      host: this,
      next,
    })
  }

  /**
   * Narrows the rows, from a consumer's own search field.
   *
   * Public because the query lives above the table in every design that has one,
   * and a consumer wiring their own input needs somewhere to send it. Returns
   * whether the change stood, the same as every other request here.
   */
  search(query: string): boolean {
    return this.requestFilter(query)
  }

  /**
   * Cycles the order by one column, which is what a click on its heading means.
   *
   * Ascending, descending, then the order the rows arrived in. Public for the
   * same reason `search` is: a consumer's own heading UI needs a way to ask.
   */
  toggleSort(field: string): boolean {
    return this.requestSort(format(cycle(parse(this.sort), field)))
  }

  /**
   * The columns into the header row, everything else into the toolbar and footer.
   *
   * Manual assignment, so a consumer's own markup is never written to.
   */
  private assign(): void {
    const root = this.renderRoot
    if (!root?.querySelector) {
      return
    }
    const head = root.querySelector<HTMLSlotElement>('slot[name="columns"]')
    if (!head?.assign) {
      return
    }
    const columns = this.tableColumns
    head.assign(...columns)
    const rest = [...this.children].filter((child) => !columns.includes(child as never))
    for (const [name, wanted] of [
      ['toolbar', true],
      ['footer', true],
    ] as const) {
      const slot = root.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
      if (slot?.assign && wanted) {
        slot.assign(...rest.filter((child) => child.getAttribute('slot') === name))
      }
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label || 'Table', role: 'grid' })
  }

  /**
   * Says on the toolbar and the footer whether anything is in them.
   *
   * **A stylesheet cannot ask.** `[part="toolbar"]:has(> slot:not(:has(*)))` is
   * two faults at once: `:has()` may not be nested inside `:has()`, so the
   * selector fails to parse and the whole rule is discarded; and
   * `slot:not(:has(*))` is as true of a filled slot as of an empty one, because
   * assigned nodes are not a slot's DOM children. Both verified in a browser.
   */
  private markEmpty(): void {
    this.markRegion('toolbar', ['toolbar'])
    /* The footer is not empty while this element is drawing its own pagination
       into it. */
    this.markRegion('footer', ['footer'], '[part="pagination"]')
  }

  /**
   * One region, hidden when its slot holds nothing and nothing of ours fills it.
   *
   * `hidden` beside the `data-empty` mirror: `data-empty` is the hook the styled
   * sheet reads, and this tier ships no sheet, so an empty region left in the box
   * tree would be a gap a headless consumer cannot close without knowing to look
   * for it. The styled rule stays too, because that sheet sets `display` on these
   * parts and therefore outranks the UA's `[hidden]` one.
   */
  private markRegion(part: string, slots: readonly string[], occupied?: string): void {
    const region = this.renderRoot?.querySelector<HTMLElement>(`[part="${part}"]`)
    const empty =
      !slots.some((name) =>
        slotFilled(this.renderRoot?.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)),
      ) && !(occupied && this.renderRoot?.querySelector(occupied))
    region?.toggleAttribute('data-empty', empty)
    region?.toggleAttribute('hidden', empty)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.markEmpty()
    this.assign()
    this.announceSort()
  }

  /**
   * Tells each column which way it is ordered, if it is the one.
   *
   * **The table owns the sort and the column carries the semantics**, which is
   * the only arrangement that can be right: `role="columnheader"` is on the
   * column, so `aria-sort` has to be there too, and the value is a fact about
   * the table's `sort` rather than about any column. Pushed down here rather
   * than pulled up there, because a column asking its parent would have to know
   * what kind of parent it has, and it is slotted into two.
   *
   * In `updated` and after `assign`, so the order announced is the order the
   * rows are already in. Announced before the rows moved is the sort a reader is
   * told about being one they cannot see yet.
   */
  private announceSort(): void {
    const current = parse(this.sort)
    for (const column of this.tableColumns) {
      column.sorted =
        current && column.canSort && column.field === current.field
          ? current.direction === 'asc'
            ? 'ascending'
            : 'descending'
          : undefined
    }
  }

  /** Columns arrive from the light DOM, which changes no property here. */
  private readonly handleSlotChange = (): void => {
    this.requestUpdate()
  }

  private renderCell(column: HelixHeadlessTableColumn, row: DataRow): TemplateResult {
    return html`<span
      part="cell"
      role="gridcell"
      style=${column.align ? `text-align: ${column.align}` : nothing}
      >${column.read(row)}</span
    >`
  }

  private renderRows(rows: readonly DataRow[]): TemplateResult {
    const columns = this.tableColumns
    const field = this.key
    /* Keyed, so a sort moves a row's element rather than rewriting every cell
       in place: focus inside a cell survives and a transition stays attached to
       the row it belongs to. The index is the fallback and is correct only
       while nothing reorders, which is why `key` is worth setting. */
    return html`${repeat(
      rows,
      (row, index) => (field ? String(row[field] ?? index) : index),
      (row, index) => html`<div
        part="row"
        role="row"
        aria-rowindex=${this.rowIndex(index)}
      >
        ${columns.map((column) => this.renderCell(column, row))}
      </div>`,
    )}`
  }

  /**
   * A row's place in the whole result, counting the header as row 1.
   *
   * **The number describes the result and not the window**, which is the whole
   * reason a virtualized or paged grid needs `aria-rowindex` at all: a screen
   * reader on page three should hear row 41, and a grid whose indices restart at
   * every page tells a reader the result is twenty rows long however many it has.
   */
  private rowIndex(within: number): number {
    const size = this.pageSize
    const offset = size > 0 ? (this.page - 1) * size : 0
    return offset + within + 2
  }

  protected override render(): TemplateResult {
    const { matched, rows } = this.view
    const template = this.template
    const columns = this.tableColumns
    const pagination = this.tag('pagination')
    return html`<div part="toolbar"><slot name="toolbar"></slot></div>
      <div
        part="table"
        role="rowgroup"
        aria-busy=${this.loading ? 'true' : nothing}
        aria-rowcount=${this.mode === 'server' ? Math.max(this.total, rows.length) + 1 : matched + 1}
        aria-colcount=${columns.length || nothing}
        style=${template ? `--data-table-template: ${template}` : nothing}
      >
        <div part="head" role="row">
          <slot name="columns" @slotchange=${this.handleSlotChange}></slot>
        </div>
        ${this.renderRows(rows)} ${this.renderStatus(rows.length > 0)}
      </div>
      <div part="footer">
        <slot name="footer"></slot>
        ${
          this.paginated
            ? html`<${pagination}
              part="pagination"
              page=${this.page}
              page-size=${this.pageSize || 1}
              total=${matched}
              @helix-navigate=${this.handleNavigate}
            ></${pagination}>`
            : nothing
        }
      </div>`
  }

  /**
   * Listens on the host, not on the slot the columns are assigned to.
   *
   * The columns are light-DOM children of this element, so their events bubble
   * to it directly and the shadow tree is not involved at all. Bound on the
   * `<slot>` instead, this works in a browser, because an event from a slotted
   * node passes through the slot in the flattened tree, and does not work in
   * happy-dom, which does not implement that propagation: measured, the host
   * hears the click and the slot does not. A spec written against the slot fails
   * in the suite while the component is correct.
   *
   * Added here rather than in the template because there is nothing in the
   * shadow tree to attach it to, and removed on disconnect because this element
   * is the listener's owner rather than its subject.
   */
  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('click', this.handleHeadClick)
    this.addEventListener('keydown', this.handleHeadKey)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('click', this.handleHeadClick)
    this.removeEventListener('keydown', this.handleHeadKey)
  }

  /** A click on a sortable heading. */
  private readonly handleHeadClick = (event: Event): void => {
    const column = this.columnFrom(event)
    if (column?.canSort) {
      this.toggleSort(column.field)
    }
  }

  /** The same on Enter and Space, since a heading that sorts is a control. */
  private readonly handleHeadKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }
    const column = this.columnFrom(event)
    if (column?.canSort) {
      event.preventDefault()
      this.toggleSort(column.field)
    }
  }

  private columnFrom(event: Event): HelixHeadlessTableColumn | undefined {
    const columns = this.tableColumns
    for (const node of event.composedPath()) {
      if (columns.includes(node as HelixHeadlessTableColumn)) {
        return node as HelixHeadlessTableColumn
      }
    }
    return undefined
  }

  /**
   * The composed pagination's request, relayed as this element's own.
   *
   * Stopped rather than allowed to bubble, because two `helix-navigate` events
   * for one click would reach a consumer's handler twice: the pagination's, and
   * this element's after it. The one that leaves carries this element's page
   * bounds rather than the inner component's.
   */
  private readonly handleNavigate = (event: HelixNavigateEvent): void => {
    event.stopPropagation()
    const wanted = Number(event.detail.value)
    if (!Number.isFinite(wanted) || !this.requestPage(wanted)) {
      event.preventDefault()
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-data-table': HelixHeadlessDataTable
  }
}
