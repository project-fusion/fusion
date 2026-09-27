import {
  customElement,
  type HelixBeforeToggleEvent,
  HelixElement,
  HelixFilterEvent,
  HelixNavigateEvent,
  HelixReorderEvent,
  HelixSelectEvent,
  HelixSortEvent,
  hostAria,
  inlineStep,
  isRtl,
  MixinCollection,
  markRegion,
  requestChange,
  VirtualizeController,
  writtenList,
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
import { at, edgeOf, type HelixHeadlessTableColumn } from '../../table/column/table-column.js'
import '../../checkbox/index.js'
import '../../pagination/index.js'
import {
  type Arranged,
  type Axis,
  arranged,
  cycle,
  type DataRow,
  format,
  ordered,
  parse,
  window_,
} from './order.js'

/**
 * @summary A table drawn from an array of rows, with sorting, filtering, and paging.
 *
 * @description
 * Declare the columns as `TableColumn` children and pass the rows as an array.
 * The schema stays readable in the HTML, and the rows can be windowed, which
 * ten thousand row elements cannot be.
 *
 * ```html
 * <helix-headless-data-table .rows=${rows} sort="name:asc" page-size="20">
 *   <helix-headless-table-column field="name" sortable>Name</helix-headless-table-column>
 *   <helix-headless-table-column field="size" text-align="end" sortable .cell=${bytes}>Size</helix-headless-table-column>
 * </helix-headless-data-table>
 * ```
 *
 * For a short table written out by hand, use `Table`, which takes rows as
 * markup.
 *
 * Sort and filter apply to the whole set, including the rows on other pages.
 *
 * **The cell values do not server-render.** The headings and the row elements
 * do. Reading a cell needs the columns, and Lit SSR does not pass the column
 * children to this element, so a crawler sees an empty table of the right
 * shape. Use `Table` when the served HTML has to carry the values.
 *
 * `selectable` adds a column of checkboxes, keyed on `row-key`:
 *
 * - A row is selected by its key, so the selection survives a sort, a filter,
 *   and a page change.
 * - `selected` holds the chosen keys, comma separated, the same shape `Listbox`
 *   uses for a multiple choice. As with `sort`, writing it applies the
 *   selection, and `default-selected` holds what the markup declared.
 * - The checkbox in the heading selects every row in the result, across pages,
 *   and shows a dash while only some are chosen.
 *
 * To act on a single row, such as opening it, put a link or a button in a cell.
 *
 * People can resize and reorder the columns. `resizable` on a column puts a
 * separator on its edge. `reorderable` on the table puts a grip on each heading
 * that has a `field`, moved by dragging or with the arrow keys. The new order
 * is written to `order` as a list of fields. Your markup is not rewritten: the
 * table assigns the headings to its header in that order.
 *
 * `csv()` returns the result as text: every row that passes the filter, in the
 * order and the columns on screen. Saving the file is up to you.
 *
 * `DataTable` has no `columns` attribute. Each `TableColumn` is part of the
 * schema, so you size a column with its own `width`. `Table` has `columns`
 * because its cells are markup you write and it can have no columns at all.
 * Written on `DataTable`, `columns` has no effect, so watch for it when you
 * move a table from `Table` to `DataTable`.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Grid, Result table, Data grid
 * @documentation https://fusion.dev/helix/components/data-table
 *
 * @slot - The columns, as `TableColumn` elements.
 * @slot footer - Content below the grid. It replaces the built-in pagination.
 * @slot toolbar - Content above the grid, such as a search field or actions.
 *
 * @event {HelixFilterEvent} helix-filter - The search query is about to change. Cancelable: cancel it to keep the current query.
 * @event {HelixNavigateEvent} helix-navigate - Another page was requested. Cancelable: cancel it to stay on the current page.
 * @event {HelixReorderEvent} helix-reorder - The columns were moved. The event carries every field in the new order. Cancelable: cancel it to keep the current order.
 * @event {HelixSelectEvent} helix-select - The selection changed. The event carries every selected key, separated by commas. Cancelable: cancel it to keep the current selection.
 * @event {HelixSortEvent} helix-sort - A different sort order was requested. Cancelable: cancel it to keep the current order.
 *
 * @csspart after - The space that stands in for the rows below the window. Only while `windowed`.
 * @csspart before - The space that stands in for the rows above the window. Only while `windowed`.
 * @csspart cell - One cell.
 * @csspart cell-selected - Added to `cell` in a selected row.
 * @csspart checkbox - A row's checkbox, or the checkbox in the heading that selects every row.
 * @csspart checkbox-box - The box drawn for the checkbox's input.
 * @csspart checkbox-control - The checkbox's input.
 * @csspart checkbox-feedback - Forwarded from the checkbox. Not shown in the table.
 * @csspart checkbox-field - The row that holds the checkbox's box.
 * @csspart checkbox-hint - Forwarded from the checkbox. Not shown in the table.
 * @csspart checkbox-label - Forwarded from the checkbox. The label is read by screen readers only.
 * @csspart checkbox-mark - The check mark, or the dash while some rows are selected.
 * @csspart checkbox-mark-checked - Added to `checkbox-mark` while its box is checked.
 * @csspart checkbox-mark-indeterminate - Added to `checkbox-mark` while only some rows are selected.
 * @csspart empty - Shown when there are no rows, because none arrived or the filter matches none. While rows are loading, the `loading` part is shown in its place.
 * @csspart footer - The region below the grid.
 * @csspart head - The row that holds the column headings. It is `display: contents`, so it takes no space.
 * @csspart live - A copy of the empty and loading messages, which screen readers announce when they change. Visually hidden in the styled tier.
 * @csspart loading - Shown while the rows are loading.
 * @csspart pagination - The built-in pagination, when it is shown.
 * @csspart pagination-first - The pagination's button that goes to the first page, shown with `ends`.
 * @csspart pagination-gap - The pagination's marker for pages that are not shown.
 * @csspart pagination-item - One item in the pagination's list, holding a page or a gap.
 * @csspart pagination-last - The pagination's button that goes to the last page, shown with `ends`.
 * @csspart pagination-list - The pagination's list of pages.
 * @csspart pagination-live - The region that announces a page change. It is clipped out of sight and still read by screen readers.
 * @csspart pagination-mark - The icon on the first, previous, next, and last buttons.
 * @csspart pagination-next - The pagination's button that goes forward one page.
 * @csspart pagination-page - The pagination's button for one page.
 * @csspart pagination-page-current - Added to `pagination-page` for the current page.
 * @csspart pagination-previous - The pagination's button that goes back one page.
 * @csspart pagination-status - The pagination's text that says which page is shown, in `compact`.
 * @csspart row - One row of data.
 * @csspart select - The cell that holds a row's checkbox.
 * @csspart select-all - The heading that holds the checkbox that selects every row.
 * @csspart select-selected - Added to `select` in a selected row.
 * @csspart table - The grid.
 * @csspart toolbar - The region above the grid.
 *
 * @cssproperty --data-table-cell-align - The alignment of the cell's column: `start`, `center`, or `end`. Unset when the column sets none. The component writes it on each cell it draws, and the stylesheet reads it. `Table` sets `--table-cell-align` for the same purpose.
 * @cssproperty --data-table-template - The column track list, worked out from the columns. The component writes it inline on the element that reads it, so setting it has no effect. Set a column's `width` to change it.
 */
@customElement('helix-headless-data-table')
export class HelixHeadlessDataTable extends MixinCollection(HelixElement) {
  /**
   * Nothing is assigned by name, so the columns can be put in a header row.
   *
   * `role="columnheader"` under `role="grid"` with no owning row is invalid,
   * and the columns are ordinary children a consumer writes with no `slot`.
   * Manual assignment is the only way to wrap them without editing the
   * consumer's markup, which is a change a React consumer's hydration reports
   * and does not patch up. The same arrangement `Table` arrived at, for the
   * same reason.
   */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixElement.shadowRootOptions,
    slotAssignment: 'manual',
  }

  /**
   * The starting search query, used until `filter` is set.
   */
  @property({ attribute: 'default-filter' })
  defaultFilter = ''

  /**
   * The starting column order, used until `order` is set.
   */
  @property({ attribute: 'default-order' })
  defaultOrder = ''

  /**
   * The starting page, used until `page` is set.
   */
  @property({ attribute: 'default-page', type: Number })
  defaultPage = 1

  /**
   * The starting page size, used until `pageSize` is set.
   */
  @property({ attribute: 'default-page-size', type: Number })
  defaultPageSize = 0

  /**
   * The keys selected at the start, separated by commas. Used until `selected`
   * is set.
   */
  @property({ attribute: 'default-selected' })
  defaultSelected = ''

  /**
   * The starting sort order, used until `sort` is set.
   */
  @property({ attribute: 'default-sort' })
  defaultSort = ''

  /**
   * The estimated height of a row before it is drawn, in pixels.
   *
   * Only read while `windowed`, and a starting guess rather than a claim: a
   * cell that wraps makes its row taller than its neighbors, and the window
   * replaces this with what each row came to as it draws. It still has to be
   * close, because it is what the scrollbar is built from before anything has
   * been measured.
   */
  @property({ type: Number })
  estimate = 32

  /**
   * The search query. A row is shown when the query matches any of its columns.
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
   * The grid's name, read by screen readers.
   */
  @property()
  label = ''

  /**
   * Where filtering, sorting, and paging happen. `client` does them in the
   * table, and `server` leaves them to your code.
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
   * The column order, as field names separated by spaces.
   *
   * A reader's move fires `helix-reorder` first, and refusing it leaves the
   * columns where they were, which is how a consumer who stores the order takes
   * the decision. `default-order` seeds an order this element then owns. A field not named
   * keeps its place after the named ones, and a column with no field never
   * moves.
   */
  @property()
  get order(): string {
    return this.orderState ?? this.defaultOrder
  }

  set order(next: string) {
    const previous = this.order
    this.orderState = next
    this.requestUpdate('order', previous)
  }

  /**
   * The page shown, counting from 1.
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
   * The number of rows on a page. `0` shows every row, with no paging.
   *
   * **It announces nothing, and that is not an omission.** Nothing in this
   * element ever asks for a different page size: a size selector is
   * `PaginationSize`, which a consumer puts in the `footer` slot and answers
   * themselves. Routing this through `requestChange` would announce an event
   * the element never has cause to fire.
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
   * Shows a pagination under the grid.
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

  /**
   * Lets users reorder the columns.
   *
   * Each heading with a `field` gets a grip, dragged along the header or moved a
   * place at a time with the arrow keys once it has focus.
   */
  @property({ type: Boolean })
  reorderable = false

  /**
   * The field that identifies each row.
   *
   * **Needed before selection exists, not after.** Lit keys the rendered rows by
   * it, so a sort moves a row's element rather than rewriting every cell in
   * place, which is what keeps focus inside a cell and keeps a CSS transition
   * attached to the row it belongs to. Left unset the index is the key, which is
   * correct only while nothing reorders: it is why this defaults to something
   * that works and is worth setting anyway.
   *
   * **`row-key` and not `key`**, which is what it was called until selection
   * needed it from React: `key` is reserved there, and a JSX `key` never reaches
   * the element, so a React page could not tell the table which field a row is.
   */
  @property({ attribute: 'row-key' })
  rowKey = ''

  /**
   * Every row of the result, in the order it arrived.
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
   * Adds a column of checkboxes for selecting rows.
   *
   * Wants `row-key`: a selection is a set of identities, and without one the rows
   * are known by their place in the result, which a sort changes.
   */
  @property({ type: Boolean })
  selectable = false

  /**
   * The keys of the selected rows, separated by commas.
   *
   * A string rather than an array, so it is an attribute a server writes and a
   * framework's hydration keeps, and the shape a multiple Listbox already uses.
   * A key holding a comma cannot be told apart from two keys, which is the
   * price of the shape. A reader's choice fires `helix-select` first, and
   * refusing it leaves the selection as it was.
   */
  @property()
  get selected(): string {
    return this.selectedState ?? this.defaultSelected
  }

  set selected(next: string) {
    const previous = this.selected
    this.selectedState = next
    this.requestUpdate('selected', previous)
  }

  /**
   * The sort order, as `field:direction`.
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
   * The number of rows in the whole result, for when the table cannot count
   * them.
   *
   * Only read in `server` mode, where `rows` is one page and its length says
   * nothing about the result. Ignored in `client` mode rather than trusted,
   * because two sources for one count is the mistake, and here the array is the
   * one that cannot be stale.
   */
  @property({ type: Number })
  total = 0

  /**
   * Draws only the rows in view, with empty space in place of the rest.
   *
   * **Not a `mode`.** `mode` says where the rows come from and who filtered
   * them; this says how many of the ones we hold get drawn. They are
   * independent: a consumer fetching five thousand rows a chunk at a time wants
   * `mode="server"` and this at once, and folding this into `mode` would be an
   * API that forbids that combination for no reason.
   *
   * **Composes with `paginated` rather than excluding it.** A window over a
   * page is coherent -- the page is the slice of the result, the window is the
   * part of that slice on screen -- and the arithmetic is the same either way,
   * so there is nothing to forbid. Together they suit a table paging at a
   * thousand rows, where the page is a reasonable fetch and a poor render.
   *
   * Off by default. Windowing costs a scroll listener, a measurement per row
   * drawn, and a `block-size` on the scrolling box, and a table of twenty rows
   * should pay none of them.
   */
  @property({ reflect: true, type: Boolean })
  windowed = false

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

  @state()
  private orderState: string | undefined = undefined

  @state()
  private selectedState: string | undefined = undefined

  /** The order while a grip is being dragged, before anybody has been asked. */
  @state()
  private dragOrder: string[] | undefined = undefined

  /** The column a grip is dragging, and the pointer doing it. */
  private dragging: { field: string; pointer: number } | undefined

  /** Said once, so a table that re-renders does not repeat it. */
  private warnedAboutKey = false

  /* No `overscan`. The controller's four is a frame of fast scrolling at a 32
     pixel row, which is a fact about the platform rather than a preference.

     **The box this scrolls carries no `data-scroller`**, which is a departure
     from the rule in `HelixElement` rather than an oversight: the `overflow`
     and the height that make the window mean anything both come from the styled
     sheet, so a page loading only `helix/headless` draws the spacers into a box
     with nothing to scroll. Marking it here is the fix and it moves layout, so
     it is measured rather than assumed, for `Megamenu`'s reason. */
  private readonly virtualize = new VirtualizeController(this, {
    /* Null while `windowed` is off, which is what keeps the controller inert
       rather than conditionally constructed: a controller is built once and
       this property can change at runtime. */
    container: () => (this.windowed ? this.partNamed('table') : null),
    count: () => this.available,
    estimate: () => this.estimate,
    /* Always measured when windowing at all. The uniform path converts offset
       to index by division and is right when rows are one height; a grid whose
       cells wrap is the case it is wrong for. */
    measured: () => this.windowed,
    rows: () => (this.windowed ? this.drawn() : []),
  })

  /**
   * The rows in the shadow tree, each with the row of the page it drew.
   *
   * **Read off `data-index` rather than counted.** `hostUpdated` runs before
   * `updated`, so what is in the tree when the controller asks is the previous
   * window; counting from the current one would record the right heights
   * against the wrong rows every time the window moved.
   */
  private drawn(): { element: HTMLElement; index: number }[] {
    return [...this.renderRoot.querySelectorAll<HTMLElement>('[part="row"][data-index]')].map(
      (element) => ({ element, index: Number(element.dataset.index) }),
    )
  }

  /**
   * How many rows there are to window over: the page, or the result.
   *
   * **Read off the held arrangement rather than counted afresh**, because the
   * controller asks this on every scroll and `matched` walks the whole result
   * whenever a filter is on. Held, a scroll through a filtered table of five
   * thousand rows costs a lookup; counted, it costs five thousand comparisons a
   * frame, which is the cost windowing was added to avoid.
   *
   * `matched` still answers where nothing is windowing, which is the path that
   * holds nothing and should not start.
   */
  private get available(): number {
    if (this.mode === 'server') {
      return this.rows.length
    }
    const matched = this.windowed ? this.arrange().rows.length : this.matched
    const size = this.pageSize
    if (size <= 0) {
      return matched
    }
    return Math.max(0, Math.min(size, matched - (this.page - 1) * size))
  }

  /**
   * The arranged result, kept between renders.
   *
   * **A window moves and the order does not.** Every scroll that reveals a row
   * re-renders, and deriving that render from `rows` would filter and sort the
   * whole result again each time: 23.7ms at five thousand rows, three frames
   * spent before a cell is drawn. Held against the inputs that change it, a
   * scroll costs a slice.
   *
   * Only the windowed path uses this. A paged table re-renders when the reader
   * asks for a page, which is rare enough that holding a second copy of the
   * result to save a sort is the wrong trade.
   */
  private held: { key: string; source: readonly DataRow[]; value: Arranged } | undefined

  private arrange(): Arranged {
    const axes = this.axes
    const key = `${this.filter}\u0000${this.sort}\u0000${axes.map((axis) => axis.field).join('\u0001')}`
    if (this.held?.key === key && this.held.source === this.rows) {
      return this.held.value
    }
    const value = arranged(this.rows, axes, { query: this.filter, spec: this.sort })
    this.held = { key, source: this.rows, value }
    return value
  }

  /** The part of a page the reader can see, which is every row when not windowed. */
  private windowOf(rows: DataRow[]): DataRow[] {
    if (!this.windowed) {
      return rows
    }
    const { first, last } = this.virtualize.window
    return rows.slice(first, last)
  }

  /** The columns declared as children, in the order they are written. */
  get tableColumns(): HelixHeadlessTableColumn[] {
    /* Read during `render`, so it answers what a render may know: nothing on a
       server, whose shim has no tree, and nothing while hydrating what one
       sent. */
    return this.knownChildren.filter(
      (child): child is HelixHeadlessTableColumn =>
        'isTableColumn' in child && child.isTableColumn === true,
    )
  }

  /**
   * The columns in their current order.
   *
   * The ones with a field are put in `order`'s order, those it does not name
   * after them in the order they were written, and a column with no field stays
   * where it was written: it has nothing to be named by.
   */
  get orderedColumns(): HelixHeadlessTableColumn[] {
    const columns = this.tableColumns
    const wanted = this.dragOrder ?? writtenList(this.order)
    if (wanted.length === 0) {
      return columns
    }
    const rank = new Map(wanted.map((field, place) => [field, place]))
    const moving = columns
      .filter((column) => column.field !== '')
      .sort(
        (a, b) =>
          (rank.get(a.field) ?? Number.POSITIVE_INFINITY) -
          (rank.get(b.field) ?? Number.POSITIVE_INFINITY),
      )
    let next = 0
    return columns.map((column) => (column.field === '' ? column : (moving[next++] ?? column)))
  }

  /**
   * The columns drawn: the arranged ones less any that are hidden.
   *
   * **A hidden column takes no track and draws no cells.** Left in, its
   * heading went and its track and its cell in every row stayed, so the header
   * row came up a heading short, the first cell filled the gap, and every row
   * after it began a column late. It keeps its place in `order` and in the
   * sort, which are by field, so showing it again puts it back where it was.
   */
  private get shownColumns(): HelixHeadlessTableColumn[] {
    return this.orderedColumns.filter((column) => column.shown)
  }

  /** The fields in the order on screen. */
  private get fields(): string[] {
    return this.orderedColumns.filter((column) => column.field !== '').map((column) => column.field)
  }

  /** The columns reduced to what the ordering needs. */
  private get axes(): Axis[] {
    return this.tableColumns
      .filter((column) => column.field !== '')
      .map((column) => ({ field: column.field, order: (row: DataRow) => column.order(row) }))
  }

  /** The track list, from the columns if there are any. */
  private get template(): string {
    const declared = this.shownColumns
    if (declared.length === 0) {
      return ''
    }
    const tracks = declared.map((column) => column.track).join(' ')
    /* The checkboxes take what they need and no more, ahead of everything. */
    return this.selectable ? `max-content ${tracks}` : tracks
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
   * **Windowing was refused here, and is now `windowed`.** The refusal is kept
   * because most of it was right, and because what changed is not that somebody
   * disagreed with it. It rested on four claims: that a third mechanism would
   * fight `paginated` and `mode="server"`; that a grid has rows of different
   * heights; that it needs a sticky header; and that `aria-rowindex` has to keep
   * describing a result the element no longer holds in full.
   *
   * Three stopped being true. `VirtualizeController` learnt to measure each row
   * and place the next by what the one above came to, which is the variable
   * heights. `aria-rowindex` was already result-relative because paging needed
   * it, so a window is a second offset on arithmetic that existed. And the
   * sticky header is one `position: sticky` on the heading cells rather than on
   * `[part="head"]`, which is `display: contents` and generates no box to stick
   * -- that is why it looked hard and is not.
   *
   * The first was avoided rather than answered. `windowed` is not a `mode` and
   * does not exclude `paginated`: it says how much of what we hold gets drawn,
   * where `mode` says where it came from, so there is no third axis to fight the
   * other two. What survives is the cost, which is why windowing is off by
   * default and why this warning still fires for a table that has none of them.
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
  private get view(): {
    available: number
    matched: number
    rows: DataRow[]
    total: number
  } {
    if (this.mode === 'server') {
      const total = Math.max(this.total, this.rows.length)
      return {
        available: this.rows.length,
        matched: total,
        rows: this.windowOf([...this.rows]),
        total,
      }
    }
    if (!this.windowed) {
      const view = ordered(this.rows, this.axes, {
        page: this.page,
        query: this.filter,
        size: this.pageSize,
        spec: this.sort,
      })
      this.warnIfCrowded(view.rows.length)
      return { ...view, available: view.rows.length }
    }
    /* No crowding warning on this path. Windowing is the answer to the warning
       rather than a case of it: the result being larger than a table can draw
       is the reason the window exists. */
    const { rows: inOrder, total } = this.arrange()
    const page = window_(inOrder, this.page, this.pageSize)
    return { available: page.length, matched: inOrder.length, rows: this.windowOf(page), total }
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

  /**
   * Emptiness is a fact about the data here, not about slotted children.
   *
   * **The page rather than the window**, which is the difference between the two
   * counts `view` carries and the reason this reads `available`. A windowed
   * table draws a slice, and a slice can be short of the rows that are there:
   * asking whether *this* slice has rows says "nothing matched" about a result
   * that matched plenty.
   *
   * The mixin's own answer counts children with no `slot`, which for this
   * element is the columns. Left in place, a table with columns and no data
   * would call itself full.
   *
   * **`sourceKnown` is the half the mixin was keeping**, and overriding without
   * it is what put "Nothing to show" over eight rows of files on every server
   * render of this family's own preview. `MixinCollection.hasRows` answers true
   * until the rows have been counted for exactly that reason, and a count is
   * what this replaced.
   */
  protected override get hasRows(): boolean {
    return this.view.available > 0 || !this.sourceKnown
  }

  /**
   * Whether this render can tell a result with no rows from one not yet handed
   * over.
   *
   * **Unknown is not empty, which is what an empty state must never say.** The
   * rows are a property, and a property is set by whoever holds the element: a
   * consumer binding it in a template has it on the server, and a consumer
   * assigning it from a script has it only once that script has run, which is
   * after the parse a server's markup ends at. A render that cannot see a
   * document cannot tell the two apart, and a hydrating render must not look,
   * its output having to be the server's.
   *
   * The same shape as `Heatmap.sourceKnown`, asked of a property rather than of
   * a document, and `childrenKnown` is already both halves of the question: a
   * server has no tree and a hydrating render may not read one.
   */
  private get sourceKnown(): boolean {
    return this.childrenKnown
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

  /** Asks for the columns in a different order, as every field in the new one. */
  private requestOrder(fields: readonly string[]): boolean {
    return requestChange({
      apply: (value) => {
        const previous = this.order
        this.orderState = value
        this.requestUpdate('order', previous)
      },
      event: (value) => new HelixReorderEvent({ value }),
      host: this,
      next: fields.join(' '),
    })
  }

  /** Asks for a different set of selected rows. */
  private requestSelected(keys: ReadonlySet<string>): boolean {
    return requestChange({
      apply: (value) => {
        const previous = this.selected
        this.selectedState = value
        this.requestUpdate('selected', previous)
      },
      event: (value) => new HelixSelectEvent({ value }),
      host: this,
      next: [...keys].join(','),
    })
  }

  /** The keys selected now. */
  private get chosen(): Set<string> {
    return new Set(
      this.selected
        .split(',')
        .map((key) => key.trim())
        .filter(Boolean),
    )
  }

  /**
   * A row's identity: its `row-key` field, or its place in the whole result.
   *
   * The place is a fallback that is right only while nothing reorders, and a
   * selection outlives an order, so `selectable` without a `row-key` says so once.
   */
  private keyOf(row: DataRow, place: number): string {
    if (this.rowKey) {
      const value = at(row, this.rowKey)
      return value === undefined || value === null ? String(place) : String(value)
    }
    if (this.selectable && !this.warnedAboutKey && typeof window !== 'undefined') {
      this.warnedAboutKey = true
      console.warn(
        `<${this.localName} selectable> has no \`row-key\`, so it knows each row by its place in the result, and a sort, a filter or new data selects a different row than the one that was chosen. Set \`row-key\` to the field that identifies a row.`,
      )
    }
    return String(place)
  }

  /**
   * Every key the box in the heading answers for: the whole result in `client`
   * mode, across every page, and the page it was handed in `server` mode, which
   * is all it holds.
   */
  private get everyKey(): string[] {
    const rows = this.mode === 'server' ? this.rows : this.arrange().rows
    return rows.map((row, place) => this.keyOf(row, place))
  }

  /** Ticks or clears one row, which the checkbox asked for and was refused. */
  private readonly toggleRow = (key: string, event: HelixBeforeToggleEvent): void => {
    event.preventDefault()
    const keys = this.chosen
    if (event.detail.checked) {
      keys.add(key)
    } else {
      keys.delete(key)
    }
    this.requestSelected(keys)
  }

  /** Selects every row, or clears them all where every one already was. */
  private readonly toggleAll = (event: HelixBeforeToggleEvent): void => {
    event.preventDefault()
    const every = this.everyKey
    const keys = this.chosen
    if (every.length > 0 && every.every((key) => keys.has(key))) {
      for (const key of every) {
        keys.delete(key)
      }
    } else {
      for (const key of every) {
        keys.add(key)
      }
    }
    this.requestSelected(keys)
  }

  /**
   * Moves a column by some places among the ones that move and are drawn.
   *
   * Counted among the drawn ones, so a key moves the heading past one a reader
   * can see: counted among all of them, a step past a hidden column changed the
   * order and nothing on screen. A hidden column keeps its place among the rest.
   */
  private moveColumn(field: string, by: number): boolean {
    const drawn = this.shownColumns.filter((column) => column.field !== '')
    const from = drawn.findIndex((column) => column.field === field)
    const past = drawn[from + by]
    if (from < 0 || !past) {
      return false
    }
    return this.requestOrder(this.placed(field, past.field, by > 0))
  }

  /** Every field in order, with one taken out and put back beside another. */
  private placed(field: string, beside: string, after: boolean): string[] {
    const fields = this.fields.filter((one) => one !== field)
    fields.splice(fields.indexOf(beside) + (after ? 1 : 0), 0, field)
    return fields
  }

  /**
   * Returns the result as CSV: every row that matches the filter, in the order
   * and columns shown, under a line of the column headings.
   *
   * **Values, not cells.** A cell may be a template, a badge or a link, so each
   * column gives its field's value, which is what a spreadsheet wants anyway.
   * A column with no field has no value and is left out, and so is a hidden
   * one, which is not on screen. In `server` mode this is the page it holds,
   * which is all it can know.
   *
   * **A text value that a spreadsheet would run is quoted as text.** A cell
   * opening with `=`, `+`, `-` or `@` is a formula to a spreadsheet, and a
   * result is often something a reader did not write: those values gain a
   * leading apostrophe, the mark spreadsheets read as "this is text". Numbers are
   * left alone, so a negative one stays a number.
   */
  csv(): string {
    const columns = this.shownColumns.filter((column) => column.field !== '')
    const rows = this.mode === 'server' ? this.rows : this.arrange().rows
    const quote = (value: unknown): string => {
      if (value === undefined || value === null) {
        return ''
      }
      let text = String(value)
      if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) {
        text = `'${text}`
      }
      return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
    }
    const head = columns.map((column) => quote(column.textContent?.trim() || column.field))
    const body = rows.map((row) => columns.map((column) => quote(at(row, column.field))))
    return [head, ...body].map((line) => line.join(',')).join('\r\n')
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
   * Filters the rows by a query from your own search field.
   *
   * Public because the query lives above the table in every design that has one,
   * and a consumer wiring their own input needs somewhere to send it. Returns
   * whether the change stood, the same as every other request here.
   */
  search(query: string): boolean {
    return this.requestFilter(query)
  }

  /**
   * Cycles the sort order of one column, as a click on its heading does.
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
    /* Hydrating a server's root, which routes by name and so cannot reorder by
       assigning: each column is sent to a slot numbered for its place on
       screen, which the header draws in that order once hydration is done, and
       to the one slot the server drew until then. The toolbar and footer
       already name theirs. */
    if (this.assignsByName) {
      const single = root.querySelector('slot[name="columns"]') !== null
      this.orderedColumns.forEach((column, index) => {
        this.route(column, single ? 'columns' : `column-${index + 1}`)
      })
      return
    }
    const head = root.querySelector<HTMLSlotElement>('slot[name="columns"]')
    if (!head?.assign) {
      return
    }
    /* In the order on screen: a manual slot draws what it was given in the order
       it was given, so this moves the headings without touching the markup. */
    const columns = this.orderedColumns
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
    this.internals.ariaMultiSelectable = this.selectable ? 'true' : null
    /* **Anything that changes which row sits at which index**, and not just a
       new array. Heights are recorded against a position in the drawn set, so a
       sort, a filter, a page or a switch to `server` all leave measurements
       describing rows that have moved out from under them -- and keeping those
       is worse than having none, because the estimate is at least honest about
       not knowing. A sort was the one that made this obvious: same `rows`, every
       index a different row.

       Compared as a signature rather than asked of `changed`, because `filter`,
       `sort`, `page` and `pageSize` are accessors over `@state` backing fields
       and what lands in `changed` depends on which of the two was written. */
    const placement = this.placement
    if (changed.has('rows') || placement !== this.measuredAgainst) {
      this.measuredAgainst = placement
      this.virtualize.forget()
    }
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
    /* `hidden` beside the `data-empty` mirror: `data-empty` is the hook a sheet
       selects on, and this tier ships none, so an empty region left in the box
       tree would be a gap a consumer cannot close without knowing to look for
       it. Both stay, since `[hidden]` is a UA rule and a sheet setting `display`
       on these parts outranks it. */
    markRegion(this.renderRoot, 'toolbar', ['toolbar'])
    /* The footer is not empty while this element is drawing its own pagination
       into it. */
    markRegion(this.renderRoot, 'footer', ['footer'], { occupied: '[part="pagination"]' })
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.markEmpty()
    this.assign()
    this.announceSort()
    /* After the rows are in the tree, so the pass that measures them is looking
       at the window this render drew. The controller holds its answer when it
       stops changing, so this settles rather than looping. */
    if (this.windowed) {
      this.virtualize.measure()
    }
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
      /* Whether a reader may move it, pushed down for the same reason: the order
         is the table's, and the grip is drawn by the column. */
      column.movable = this.reorderable && column.field !== ''
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

  /**
   * One cell, carrying its column's edge as a fact rather than as a decision.
   *
   * **A fact published rather than a property chosen**, which is what `Table`
   * does with the same attribute: what lining up *means*, a `justify-content`
   * for a value that fits or a `text-align` for one that wraps, belongs to
   * whoever draws the cell. Written here as an inline `text-align` it was this
   * tier choosing, in the tier that ships no CSS, and a consumer could not
   * overrule it either, an inline declaration beating any `::part(cell)` rule
   * they wrote.
   *
   * Only the three edges reach it, `text-align` being a string anybody can write and
   * this being a style attribute: `edgeOf` is that guard, and `Table` holds the
   * same value to the same three.
   */
  private renderCell(
    column: HelixHeadlessTableColumn,
    row: DataRow,
    picked: boolean,
  ): TemplateResult {
    const edge = edgeOf(column.textAlign)
    return html`<span
      part="cell${picked ? ' cell-selected' : ''}"
      role="gridcell"
      style=${edge ? `--data-table-cell-align: ${edge}` : nothing}
      >${column.read(row)}</span
    >`
  }

  /**
   * A checkbox, named for what it chooses, whose change the table takes.
   *
   * Refused and re-asked rather than left to tick itself: the selection is the
   * table's, so the box only ever shows what `selected` says.
   */
  private renderCheckbox(
    name: string,
    checked: boolean,
    indeterminate: boolean,
    toggle: (event: HelixBeforeToggleEvent) => void,
  ): TemplateResult {
    const checkbox = this.tag('checkbox')
    return html`<${checkbox}
      part="checkbox"
      exportparts="box: checkbox-box, control: checkbox-control, feedback: checkbox-feedback,
        field: checkbox-field, hint: checkbox-hint, label: checkbox-label, mark: checkbox-mark,
        mark-checked: checkbox-mark-checked, mark-indeterminate: checkbox-mark-indeterminate"
      aria-label=${name}
      .checked=${checked}
      .indeterminate=${indeterminate}
      @helix-before-toggle=${toggle}
    ></${checkbox}>`
  }

  private renderRows(rows: readonly DataRow[]): TemplateResult {
    const columns = this.shownColumns
    const field = this.rowKey
    /* Keyed, so a sort moves a row's element rather than rewriting every cell
       in place: focus inside a cell survives and a transition stays attached to
       the row it belongs to. The index is the fallback and is correct only
       while nothing reorders, which is why `row-key` is worth setting.

       Counted from the window's start rather than from the row's place in it,
       or every window would key its first row `0` and hand a scroll the element
       belonging to a row it has just left. */
    const start = this.windowStart
    const chosen = this.selectable ? this.chosen : undefined
    const named = columns.find((column) => column.field !== '')
    return html`${repeat(
      rows,
      (row, index) => (field ? String(row[field] ?? start + index) : start + index),
      (row, index) => {
        const key = chosen ? this.keyOf(row, this.rowIndex(index) - 2) : ''
        const picked = chosen?.has(key) ?? false
        /* Selected is said on the row for the accessibility tree and on each of
           its cells for a stylesheet: the row is `display: contents`, so the
           cells are what a selection is painted on, and nothing outside can
           reach a cell by the row it sits in. */
        return html`<div
          part="row"
          role="row"
          aria-rowindex=${this.rowIndex(index)}
          aria-selected=${chosen ? String(picked) : nothing}
          data-index=${this.windowed ? start + index : nothing}
        >
          ${
            chosen
              ? html`<span part="select${picked ? ' select-selected' : ''}" role="gridcell"
                  >${this.renderCheckbox(
                    `Select ${named ? String(named.order(row) ?? key) : key}`,
                    picked,
                    false,
                    (event) => this.toggleRow(key, event),
                  )}</span
                >`
              : nothing
          }${columns.map((column) => this.renderCell(column, row, picked))}
        </div>`
      },
    )}`
  }

  /**
   * A row's place in the whole result, counting the header as row 1.
   *
   * **The number describes the result and not the window**, which is the whole
   * reason a virtualized or paged grid needs `aria-rowindex` at all: a screen
   * reader on page three should hear row 41, and a grid whose indices restart at
   * every page tells a reader the result is twenty rows long however many it has.
   *
   * A window is the second offset and stacks on the page: with both on, row one
   * of the window is the page's start plus how far down the page it begins.
   */
  private rowIndex(within: number): number {
    const size = this.pageSize
    const page = size > 0 ? (this.page - 1) * size : 0
    return page + this.windowStart + within + 2
  }

  /**
   * What decides which row is at which index, as one comparable value.
   *
   * Not the rows themselves: those are compared by identity beside this, and a
   * consumer handing back an equal array is handing back the same rows in the
   * same order whatever object it is.
   */
  private get placement(): string {
    return [this.mode, this.filter, this.sort, this.page, this.pageSize].join('\u0000')
  }

  /** The signature the recorded heights were measured against. */
  private measuredAgainst = ''

  /** Where the window begins in the page, which is the top when there is none. */
  private get windowStart(): number {
    return this.windowed ? this.virtualize.window.first : 0
  }

  /**
   * The room the rows outside the window would have taken.
   *
   * **`role="presentation"`, because this is geometry standing inside a
   * `rowgroup`.** A bare `div` there is a child the role does not allow, and a
   * screen reader walking the rows would meet something that is not one. The
   * room itself is what keeps the scrollbar honest: a box that scrolls twenty
   * rows while claiming ten thousand gives a thumb the size of its track.
   */
  private renderSpacer(end: 'after' | 'before'): TemplateResult | typeof nothing {
    if (!this.windowed) {
      return nothing
    }
    const { after, before } = this.virtualize.window
    /* Written out rather than bound through `part=${end}`. A part assembled at
       run time is one nothing can check: the rule that pairs a documented part
       with a rendered one reads the template, and a name it cannot see is a
       `::part()` a consumer styles to no effect. */
    return end === 'before'
      ? html`<div part="before" role="presentation" style="block-size: ${before}px"></div>`
      : html`<div part="after" role="presentation" style="block-size: ${after}px"></div>`
  }

  /** The controller owns the geometry; this is only what tells it to look again. */
  private readonly handleScroll = (): void => {
    if (this.windowed) {
      this.virtualize.measure()
    }
  }

  /** The heading of the checkbox column, which selects the whole result. */
  private renderSelectAll(): TemplateResult {
    const every = this.everyKey
    const keys = this.chosen
    const count = every.filter((key) => keys.has(key)).length
    return html`<span part="select-all" role="columnheader">${this.renderCheckbox(
      'Select every row',
      every.length > 0 && count === every.length,
      count > 0 && count < every.length,
      this.toggleAll,
    )}</span>`
  }

  protected override render(): TemplateResult {
    const { available, matched, rows } = this.view
    /* Through `hasRows`, which every other collection in the library asks and
       which this one overrode and then never read: two spellings of one
       question, and the live one was not the documented one. */
    const filled = this.hasRows
    const template = this.template
    const columns = this.shownColumns
    const pagination = this.tag('pagination')
    /* How long the result is, and whether this render is entitled to say.
       `mode="server"` reads the consumer's own `total`, which is an attribute
       and so is there on a server too; anything else counts the rows, which are
       a property. A count of nothing where `sourceKnown` is false is not a
       count, and every number below is left off rather than served as a zero:
       `aria-colcount` on the next line has answered it that way since this
       family's server spec was written, and the argument there is the argument
       here. A screen reader told a table has no rows has been told something
       false; one told nothing counts what it can see. */
    const counted = this.mode === 'server' ? Math.max(this.total, available) : matched
    const countKnown = counted > 0 || this.sourceKnown
    return html`<div part="toolbar"><slot name="toolbar"></slot></div>
      <div
        part="table"
        role="rowgroup"
        aria-busy=${this.loading ? 'true' : nothing}
        aria-rowcount=${countKnown ? counted + 1 : nothing}
        aria-colcount=${columns.length ? columns.length + (this.selectable ? 1 : 0) : nothing}
        style=${template ? `--data-table-template: ${template}` : nothing}
        @scroll=${this.handleScroll}
      >
        <div part="head" role="row">
          ${this.selectable ? this.renderSelectAll() : nothing}${
            this.assignsByName && !this.hydrating
              ? this.orderedColumns.map(
                  (_, index) =>
                    html`<slot name=${`column-${index + 1}`} @slotchange=${this.handleSlotChange}></slot>`,
                )
              : html`<slot name="columns" @slotchange=${this.handleSlotChange}></slot>`
          }
        </div>
        ${this.renderSpacer('before')}${this.renderRows(rows)}${this.renderSpacer('after')}
        ${this.renderStatus(filled)}
      </div>
      ${this.renderLive(filled)}
      <div part="footer">
        <slot name="footer"></slot>
        ${
          this.paginated
            ? html`<${pagination}
              part="pagination"
              exportparts="first: pagination-first, gap: pagination-gap, item: pagination-item,
                last: pagination-last, list: pagination-list, live: pagination-live,
                mark: pagination-mark, next: pagination-next, page: pagination-page,
                page-current: pagination-page-current, previous: pagination-previous,
                status: pagination-status"
              page=${this.page}
              page-size=${this.pageSize || 1}
              total=${countKnown ? matched : nothing}
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
    this.addEventListener('keydown', this.handleGripKey)
    this.addEventListener('pointerdown', this.handleGripDown)
    this.addEventListener('helix-before-resize', this.handleResize)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('click', this.handleHeadClick)
    this.removeEventListener('keydown', this.handleGripKey)
    this.removeEventListener('pointerdown', this.handleGripDown)
    this.removeEventListener('helix-before-resize', this.handleResize)
    this.stopDrag()
  }

  /**
   * A click on a sortable heading, anywhere but its grip or its edge.
   *
   * Enter and Space arrive here too, as the click the heading's sort button
   * makes of them, so a keyboard needs nothing of its own.
   */
  private readonly handleHeadClick = (event: Event): void => {
    if (this.partIn(event, 'grip') || this.partIn(event, 'resizer')) {
      return
    }
    const column = this.columnFrom(event)
    if (column?.canSort) {
      this.toggleSort(column.field)
    }
  }

  /** Whether the event passed through a part of that name on its way here. */
  private partIn(event: Event, name: string): boolean {
    return event
      .composedPath()
      .some((node) => node instanceof Element && node.getAttribute('part') === name)
  }

  /** The arrow keys on a grip move its column a place, along the writing direction. */
  private readonly handleGripKey = (event: KeyboardEvent): void => {
    if (!this.partIn(event, 'grip')) {
      return
    }
    const column = this.columnFrom(event)
    const by = inlineStep(this, event.key)
    if (column && by !== 0) {
      event.preventDefault()
      this.moveColumn(column.field, by)
    }
  }

  /**
   * A grip taken hold of: the headings follow the pointer and the order is asked
   * for once it lets go.
   *
   * Previewed without an event, because a drag passes through a dozen orders on
   * its way to the one the reader meant, and a consumer should hear the one.
   */
  private readonly handleGripDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !this.partIn(event, 'grip')) {
      return
    }
    const column = this.columnFrom(event)
    if (!column?.field) {
      return
    }
    this.dragging = { field: column.field, pointer: event.pointerId }
    this.dragOrder = this.fields
    window.addEventListener('pointermove', this.handleGripMove)
    window.addEventListener('pointerup', this.handleGripUp)
    window.addEventListener('pointercancel', this.handleGripCancel)
  }

  private readonly handleGripMove = (event: PointerEvent): void => {
    const dragging = this.dragging
    if (!dragging || event.pointerId !== dragging.pointer || !this.dragOrder) {
      return
    }
    const rtl = isRtl(this)
    /* Only the drawn ones: a hidden heading has no box, and its zero rect sat
       left of every pointer, so it counted as passed wherever it was. */
    const others = this.shownColumns.filter(
      (column) => column.field !== '' && column.field !== dragging.field,
    )
    /* How many of the other headings the pointer has passed, reading in the
       writing direction: the dragged one goes after the last of them, or ahead
       of the first where it has passed none. */
    const place = others.filter((column) => {
      const box = column.shadowRoot?.querySelector('[part="column"]')?.getBoundingClientRect()
      if (!box) {
        return false
      }
      const middle = box.left + box.width / 2
      return rtl ? event.clientX < middle : event.clientX > middle
    }).length
    const beside = others[place - 1] ?? others[0]
    if (!beside) {
      return
    }
    const next = this.placed(dragging.field, beside.field, place > 0)
    if (next.join(' ') !== this.dragOrder.join(' ')) {
      this.dragOrder = next
    }
  }

  private readonly handleGripUp = (): void => {
    const wanted = this.dragOrder
    this.stopDrag()
    if (wanted && wanted.join(' ') !== this.fields.join(' ')) {
      this.requestOrder(wanted)
    }
  }

  private readonly handleGripCancel = (): void => {
    this.stopDrag()
  }

  private stopDrag(): void {
    this.dragging = undefined
    this.dragOrder = undefined
    window.removeEventListener('pointermove', this.handleGripMove)
    window.removeEventListener('pointerup', this.handleGripUp)
    window.removeEventListener('pointercancel', this.handleGripCancel)
  }

  /**
   * A column asked for a width. The column keeps its own, so all this does is
   * draw the grid again once it has, a microtask on, when the width has landed.
   */
  private readonly handleResize = (): void => {
    queueMicrotask(() => this.requestUpdate())
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
