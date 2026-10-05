import {
  countLabel,
  customElement,
  deepActiveElement,
  deepContains,
  fillTemplate,
  formatNumbers,
  HelixActivateEvent,
  type HelixBeforeToggleEvent,
  HelixElement,
  HelixExpandEvent,
  HelixFilterEvent,
  HelixFilteredEvent,
  HelixLoadMoreEvent,
  HelixNavigateEvent,
  HelixReorderEvent,
  HelixReorderedEvent,
  HelixSelectEvent,
  HelixSelectedEvent,
  HelixSortEvent,
  HelixSortedEvent,
  hostAria,
  inlineStep,
  isRtl,
  MixinCollection,
  markRegion,
  rangeAdd,
  reportRuntime,
  requestChange,
  Typeahead,
  typesCharacter,
  VirtualizeController,
  writtenList,
} from '@fusion.dev/helix-core'
import { caretDown, caretRight } from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
/* `static-html`'s `html`, because the pagination's tag is interpolated: a
   template naming a literal `helix-pagination` renders the styled element from
   the headless tier, and `lit`'s own `html` treats `${tag}` in tag position as
   text, which renders an element called `lit$…$` that lays out as nothing.
   Measured: the styled spec read `localName` as `lit$640177303$`. */
import { html } from 'lit/static-html.js'
import { at, edgeOf, type HelixHeadlessTableColumn } from '../../table/column/table-column.js'
import '../../checkbox/index.js'
import '../../pagination/index.js'
import { type Grown, grow } from '../tree.js'
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

/** What makes an element a control the grid moves focus into, whatever its tab index. */
const CONTROL = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',')

/** Whether an element inside a cell is a control a reader can work. */
const isControl = (element: HTMLElement): boolean =>
  element.matches(CONTROL) || element.shadowRoot?.delegatesFocus === true

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
 * - Shift with a press on a checkbox selects every row between it and the row
 *   last chosen.
 *
 * To act on a single row, such as opening it, put a link or a button in a cell.
 *
 * The grid is one tab stop, and the arrow keys move between its cells, the
 * headings included:
 *
 * - The arrow keys move one cell, and Home and End to the ends of the row.
 * - Control with Home or End moves to the first or the last cell of the grid.
 * - Page Up and Page Down move by the rows that fit in view.
 * - Enter or F2 moves into the cell's controls, and Escape moves back to the
 *   cell. Tab moves between the controls of one cell.
 * - Enter or Space on a sortable heading sorts by it, and Space on a row of a
 *   `selectable` table selects it.
 * - In a `selectable` table, Shift with Up or Down selects the rows it moves
 *   across, Shift with Space selects every row from the one last chosen, and
 *   Control or Command with A selects every row.
 * - Typing letters moves to the next row whose row header starts with them.
 *
 * Each row is named by its row header, the column marked `row-header`, or the
 * first column with a `field` where none is. A screen reader says it as a reader
 * moves between rows.
 *
 * **Rows that hold rows.** `child-field` names the field that holds a row's
 * child rows, and the grid becomes a tree grid. The row header column draws a
 * mark that a press opens and closes a row by, and `expanded` holds the keys of the open
 * rows, which `row-key` names. Right on a closed row's header opens it, Left on
 * an open one closes it, and Left on a child moves to its parent. A sort orders
 * the rows under each parent, and a search shows the rows that lead to each
 * match, open.
 *
 * `load-more` adds a row after the last one with a button that sends
 * `helix-load-more`. A `windowed` table also sends it by itself once a reader
 * scrolls within one screen of the end, once for each number of rows. Add the
 * next rows to `rows`, and set `loading` while they are on their way.
 *
 * The controls inside the cells leave the tab order, so Tab moves past the
 * whole grid. A windowed table keeps the row holding focus drawn while the
 * rest scroll away.
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
 * @event {HelixActivateEvent} helix-activate - Fired after the page changes, with the new page as a string in `detail.value`.
 * @event {HelixExpandEvent} helix-expand - Fired after a row opens or closes, with every open row's key, separated by commas, which `expanded` also holds.
 * @event {HelixFilterEvent} helix-filter - The search query is about to change. Cancelable: cancel it to keep the current query.
 * @event {HelixFilteredEvent} helix-filtered - Fired after the search query changes, with the new query.
 * @event {HelixLoadMoreEvent} helix-load-more - Fired when a reader asks for more rows, by the `load-more` row's button or by scrolling a `windowed` table near its end.
 * @event {HelixNavigateEvent} helix-navigate - Another page was requested. Cancelable: cancel it to stay on the current page.
 * @event {HelixReorderEvent} helix-reorder - The columns are about to move. The event carries every field in the new order. Cancelable: cancel it to keep the current order.
 * @event {HelixReorderedEvent} helix-reordered - Fired after the columns move, with every field in the new order.
 * @event {HelixSelectEvent} helix-select - The selection is about to change. The event carries every selected key, separated by commas. Cancelable: cancel it to keep the current selection.
 * @event {HelixSelectedEvent} helix-selected - Fired after the selection changes, with every selected key, separated by commas.
 * @event {HelixSortEvent} helix-sort - A different sort order was requested. Cancelable: cancel it to keep the current order.
 * @event {HelixSortedEvent} helix-sorted - Fired after the sort order changes, with the new order.
 *
 * @csspart after - The space that stands in for the rows below the window. Only while `windowed`.
 * @csspart before - The space that stands in for the rows above the window. Only while `windowed`.
 * @csspart cell - One cell.
 * @csspart cell-header - Added to `cell` for a cell of the row header column.
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
 * @csspart checkbox-mark-dash - Added to `checkbox-mark` while it draws the dash, which it keeps until its box is checked.
 * @csspart checkbox-mark-indeterminate - Added to `checkbox-mark` while only some rows are selected.
 * @csspart empty - Shown when there are no rows, because none arrived or the filter matches none. While rows are loading, the `loading` part is shown in its place.
 * @csspart footer - The region below the grid.
 * @csspart head - The row that holds the column headings. It is `display: contents`, so it takes no space.
 * @csspart live - A copy of the empty and loading messages, which screen readers announce when they change. Visually hidden in the styled tier.
 * @csspart loading - Shown while the rows are loading.
 * @csspart more - The row after the last one that holds the button for more rows, while `load-more` is set.
 * @csspart more-button - The button that asks for more rows.
 * @csspart more-cell - The cell of the `more` row, which spans every column.
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
 * @csspart toggle - The mark in a row header that a press opens and closes its row by, in a tree grid.
 * @csspart toggle-mark - The caret in `toggle`. It points along the line while the row is closed and down while it is open.
 * @csspart toggle-open - Added to `toggle` while its row is open.
 * @csspart toolbar - The region above the grid.
 *
 * @cssproperty --data-table-cell-align - The alignment of the cell's column: `start`, `center`, or `end`. Unset when the column sets none. The component writes it on each cell it draws, and the stylesheet reads it. `Table` sets `--table-cell-align` for the same purpose.
 * @cssproperty --data-table-level - How deep a row is in a tree grid, from 1. The component writes it on each row header cell, and the stylesheet indents by it.
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

  /** The word for an ascending sort, in `sorted-label`. */
  @property({ attribute: 'ascending-label' })
  ascendingLabel = 'ascending'

  /**
   * The field that holds a row's child rows, as an array. Set it, and `row-key`,
   * and the grid becomes a tree grid.
   *
   * Reflected, because the styled tier indents a tree grid's row headers by
   * it. No default, so a table that sets none writes nothing onto its host.
   */
  @property({ attribute: 'child-field', reflect: true })
  childField?: string

  /**
   * The keys of the rows open at the start, separated by commas. Used until
   * `expanded` is set.
   */
  @property({ attribute: 'default-expanded' })
  defaultExpanded = ''

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

  /** The word for a descending sort, in `sorted-label`. */
  @property({ attribute: 'descending-label' })
  descendingLabel = 'descending'

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
   * The keys of the open rows in a tree grid, separated by commas, the shape of
   * `selected`. A reader's press writes it and then sends `helix-expand`.
   */
  @property()
  get expanded(): string {
    return this.expandedState ?? this.defaultExpanded
  }

  set expanded(next: string) {
    const previous = this.expanded
    this.expandedState = next
    this.requestUpdate('expanded', previous)
  }

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
   * The built-in pagination's name for a gap in its run of pages. `{page}` is
   * replaced with the page it jumps to.
   */
  @property({ attribute: 'gap-label' })
  gapLabel = 'Skip to page {page}'

  /**
   * The grid's name, read by screen readers.
   */
  @property()
  label = ''

  /**
   * Draws a row after the last one with a button that asks for more rows.
   *
   * The button sends `helix-load-more`, and a `windowed` table sends it by
   * itself once a reader scrolls within one screen of the end. Turn it off
   * when there are no more rows to load.
   */
  @property({ attribute: 'load-more', type: Boolean })
  loadMore = false

  /** The words on the button in the `more` row. */
  @property({ attribute: 'load-more-label' })
  loadMoreLabel = 'Load more'

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

  /** The built-in pagination's name for the button that moves forward a page. */
  @property({ attribute: 'next-label' })
  nextLabel = 'Next page'

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
   * The built-in pagination's name for one page. `{page}` and `{pages}` are
   * replaced with the page number and the page count.
   */
  @property({ attribute: 'page-label' })
  pageLabel = 'Page {page}'

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

  /** The name of the built-in pagination's navigation landmark. */
  @property({ attribute: 'pagination-label' })
  paginationLabel = 'Pagination'

  /** The built-in pagination's name for the button that moves back a page. */
  @property({ attribute: 'previous-label' })
  previousLabel = 'Previous page'

  /**
   * Lets users reorder the columns.
   *
   * Each heading with a `field` gets a grip, dragged along the header or moved a
   * place at a time with the arrow keys once it has focus.
   */
  @property({ type: Boolean })
  reorderable = false

  /** What screen readers hear when a search leaves one row. `{count}` is the count. */
  @property({ attribute: 'result-label' })
  resultLabel = '{count} result'

  /**
   * What screen readers hear when a search leaves any other number of rows.
   * `{count}` is the count.
   */
  @property({ attribute: 'results-label' })
  resultsLabel = '{count} results'

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

  /** The name of the checkbox in the heading that selects every row. */
  @property({ attribute: 'select-all-label' })
  selectAllLabel = 'Select every row'

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
   * What screen readers hear when the chosen rows change. `{count}` is how many
   * rows are chosen.
   */
  @property({ attribute: 'selected-label' })
  selectedLabel = '{count} selected'

  /**
   * The name of a row's checkbox. `{row}` is replaced with the row's value in
   * the first column that has a field, or with its key.
   */
  @property({ attribute: 'select-row-label' })
  selectRowLabel = 'Select {row}'

  /**
   * The sort order, as `field:direction`.
   *
   * A reader's click on a sortable heading fires `helix-sort` first, and
   * refusing it leaves the order as it was. To own the order yourself, refuse
   * the event and set this to the order you chose. `default-sort` seeds an
   * order this element then owns.
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
   * What screen readers hear when the table is sorted. `{column}` is the
   * column's heading and `{order}` is `ascending-label` or `descending-label`.
   */
  @property({ attribute: 'sorted-label' })
  sortedLabel = 'Sorted by {column}, {order}'

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

  /** What screen readers hear when the table stops being sorted. */
  @property({ attribute: 'unsorted-label' })
  unsortedLabel = 'Not sorted'

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

  @state()
  private expandedState: string | undefined = undefined

  /**
   * The row holding the grid's tab stop: `-1` for the headings, otherwise a
   * row of the page counted from 0. Unset until a reader moves, when the stop
   * rests on the first row, or on the headings where there is none.
   */
  @state()
  private activeRow: number | undefined = undefined

  /** The column holding the grid's tab stop, the checkbox column counted. */
  @state()
  private activeColumn = 0

  /**
   * The key of the row holding the tab stop, so a sort or a filter keeps the
   * stop on the row a reader was on. Only kept while `row-key` is set.
   */
  private activeKey: string | undefined = undefined

  /** Whether the next render should move focus to the active cell. */
  private focusWanted = false

  /** The page as last drawn, for the keys to count rows against between renders. */
  private drawnPage: readonly DataRow[] = []

  /** Whether the last render drew the `more` row, which follows the page's rows. */
  private moreDrawn = false

  /** The letters typed at the grid, which move to the row whose header they start. */
  private readonly typeahead = new Typeahead()

  /**
   * The key of the row a range selection runs from: the row last chosen or let
   * go one at a time.
   */
  private anchorKey: string | undefined = undefined

  /** Whether Shift was held on the last press, for a checkbox that asks to range. */
  private shiftPressed = false

  /** The number of rows when `helix-load-more` last went out on its own. */
  private askedAt = -1

  /** The grid's size as the last render counted it, for the internals. */
  private counts: { columns: number | undefined; rows: number | undefined } = {
    columns: undefined,
    rows: undefined,
  }

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
    /* **Measured by its first cell.** A row is `display: contents` and has no
       box, so its own height reads as zero, every row stayed at the estimate,
       and a row drawn taller than that moved the content under the scroll each
       time the window moved: the browser's scroll anchoring then moved the
       offset back, and the window swung between two places until the
       controller gave up and blamed the box. A cell is a grid item, stretched
       to its row. */
    return [...this.renderRoot.querySelectorAll<HTMLElement>('[part="row"][data-index]')].flatMap(
      (row) => {
        const cell = row.firstElementChild
        return cell instanceof HTMLElement
          ? [{ element: cell, index: Number(row.dataset.index) }]
          : []
      },
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
      return this.childField ? this.tree().rows.length : this.rows.length
    }
    const matched = this.windowed ? this.flat().rows.length : this.matched
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

  /** The tree last laid out, kept against what laid it out. */
  private grown: { key: string; source: readonly DataRow[]; value: Grown } | undefined

  /**
   * The rows of a tree grid, laid out flat with each open row's children under
   * it. `server` mode lays out the rows it was handed and neither filters nor
   * sorts them.
   */
  private tree(): Grown {
    const axes = this.axes
    const server = this.mode === 'server'
    const query = server ? '' : this.filter
    const spec = server ? '' : this.sort
    const key = [
      query,
      spec,
      this.childField,
      this.expanded,
      axes.map((axis) => axis.field).join('\u0001'),
    ].join('\u0000')
    if (this.grown?.key === key && this.grown.source === this.rows) {
      return this.grown.value
    }
    if (!this.rowKey && !this.warnedAboutKey && typeof window !== 'undefined') {
      this.warnedAboutKey = true
      reportRuntime({
        kind: 'missing-row-key',
        message: `<${this.localName} child-field> has no \`row-key\`, so it cannot tell which rows are open. Set \`row-key\` to the field that identifies a row.`,
        tag: this.localName,
      })
    }
    const open = this.opened
    const value = grow(this.rows, axes, {
      field: this.childField ?? '',
      isOpen: (row) => open.has(this.rowKeyOf(row, -1)),
      query,
      spec,
    })
    this.grown = { key, source: this.rows, value }
    return value
  }

  /** The keys of the open rows. */
  private get opened(): Set<string> {
    return new Set(writtenList(this.expanded.replaceAll(',', ' ')))
  }

  /**
   * The result in order: the tree laid out flat in a tree grid, and the
   * arranged rows otherwise.
   */
  private flat(): Arranged {
    if (this.childField) {
      const { rows, total } = this.tree()
      return { rows, total }
    }
    return this.arrange()
  }

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

  /**
   * The part of a page the reader can see, which is every row when not
   * windowed, each with its place in the page.
   *
   * **The row holding the tab stop is drawn wherever the window is.** A row
   * that scrolled out took the focus inside it to the body, and a grid whose
   * one tab stop is not drawn has no tab stop at all. It is drawn beside the
   * window, on the side it belongs, and the spacer on that side gives up its
   * room, so every other row stays where it was.
   */
  private windowOf(rows: readonly DataRow[]): { index: number; row: DataRow }[] {
    const all = rows.map((row, index) => ({ index, row }))
    if (!this.windowed) {
      return all
    }
    const { first, last } = this.virtualize.window
    const drawn = all.slice(first, last)
    const kept = this.keptRow(rows)
    if (kept === undefined) {
      return drawn
    }
    const row = rows[kept] as DataRow
    return kept < first ? [{ index: kept, row }, ...drawn] : [...drawn, { index: kept, row }]
  }

  /** The row drawn outside the window to keep the tab stop, if there is one. */
  private keptRow(rows: readonly DataRow[]): number | undefined {
    if (!this.windowed) {
      return undefined
    }
    const row = this.currentRow(rows)
    const { first, last } = this.virtualize.window
    /* The `more` row is drawn after the rows whatever the window, so it is
       never kept. */
    return row >= 0 && row < rows.length && (row < first || row >= last) ? row : undefined
  }

  /** What a row is known by between renders: its `row-key`, or its place in the page. */
  private rowKeyOf(row: DataRow, index: number): string {
    if (!this.rowKey) {
      return String(index)
    }
    const value = at(row, this.rowKey)
    return value === undefined || value === null ? String(index) : String(value)
  }

  /**
   * The row holding the tab stop in this page: the row with the key it was
   * on, where `row-key` says, and otherwise the same place, held to the page.
   */
  private currentRow(rows: readonly DataRow[]): number {
    const asked = this.activeRow
    if (asked === undefined) {
      /* At rest the stop follows the window, so Tab lands on a row in view. */
      const first = this.windowed ? this.virtualize.window.first : 0
      return rows.length > 0 ? Math.min(first, rows.length - 1) : -1
    }
    if (asked >= 0 && this.activeKey !== undefined && this.rowKey) {
      const found = rows.findIndex((row, index) => this.rowKeyOf(row, index) === this.activeKey)
      if (found >= 0) {
        return found
      }
    }
    return Math.min(asked, rows.length - 1 + (this.moreDrawn ? 1 : 0))
  }

  /** How many cells a row has: the checkbox and every drawn column. */
  private get width(): number {
    return this.shownColumns.length + (this.selectable ? 1 : 0)
  }

  /** The column holding the tab stop, held to the row's width. */
  private get currentColumn(): number {
    return Math.max(0, Math.min(this.activeColumn, this.width - 1))
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
    reportRuntime({
      kind: 'too-many-rows',
      message:
        `<${this.localName}> is drawing ${drawn} rows at once, which is past the ${HelixHeadlessDataTable.COMFORTABLE} ` +
        'it stays responsive to: every row is rendered, so this costs roughly 37 microseconds each and ' +
        'crosses an interaction budget around 2,700. Set `page-size` to paginate, or `mode="server"` ' +
        'to hand it one page at a time with `total` describing the whole result.',
      tag: this.localName,
    })
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
    page: readonly DataRow[]
    total: number
  } {
    if (this.mode === 'server') {
      const total = Math.max(this.total, this.rows.length)
      const page = this.childField ? this.tree().rows : this.rows
      return { available: page.length, matched: total, page, total }
    }
    if (this.childField) {
      const { rows: inOrder, total } = this.tree()
      const page = window_(inOrder, this.page, this.pageSize)
      if (!this.windowed) {
        this.warnIfCrowded(page.length)
      }
      return { available: page.length, matched: inOrder.length, page, total }
    }
    if (!this.windowed) {
      const view = ordered(this.rows, this.axes, {
        page: this.page,
        query: this.filter,
        size: this.pageSize,
        spec: this.sort,
      })
      this.warnIfCrowded(view.rows.length)
      return {
        available: view.rows.length,
        matched: view.matched,
        page: view.rows,
        total: view.total,
      }
    }
    /* No crowding warning on this path. Windowing is the answer to the warning
       rather than a case of it: the result being larger than a table can draw
       is the reason the window exists. */
    const { rows: inOrder, total } = this.arrange()
    const page = window_(inOrder, this.page, this.pageSize)
    return { available: page.length, matched: inOrder.length, page, total }
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
    if (this.childField) {
      return this.tree().rows.length
    }
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
        this.dispatchEvent(new HelixSortedEvent({ value }))
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
        this.dispatchEvent(new HelixReorderedEvent({ value }))
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
        this.dispatchEvent(new HelixSelectedEvent({ value }))
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
      reportRuntime({
        kind: 'missing-row-key',
        message: `<${this.localName} selectable> has no \`row-key\`, so it knows each row by its place in the result, and a sort, a filter or new data selects a different row than the one that was chosen. Set \`row-key\` to the field that identifies a row.`,
        tag: this.localName,
      })
    }
    return String(place)
  }

  /**
   * Every key the box in the heading answers for: the whole result in `client`
   * mode, across every page, and the page it was handed in `server` mode, which
   * is all it holds.
   */
  private get everyKey(): string[] {
    if (this.childField) {
      return this.tree().every.map((row, place) => this.keyOf(row, place))
    }
    const rows = this.mode === 'server' ? this.rows : this.arrange().rows
    return rows.map((row, place) => this.keyOf(row, place))
  }

  /**
   * Ticks or clears one row, which the checkbox asked for and was refused. With
   * Shift held it selects every row from the one last chosen.
   */
  private readonly toggleRow = (key: string, event: HelixBeforeToggleEvent): void => {
    event.preventDefault()
    const to = this.pageKeys.indexOf(key)
    if (this.shiftPressed && this.anchorKey !== undefined && to >= 0) {
      this.selectRange(to)
      return
    }
    this.chooseRow(key, event.detail.checked)
  }

  /** The keys of the rows on the page, in the order they are drawn. */
  private get pageKeys(): string[] {
    return this.drawnPage.map((row, index) => this.keyOf(row, this.rowIndex(index) - 2))
  }

  /**
   * Selects every row on the page from the one a range runs from to row `to`,
   * keeping what was already selected. With no row to run from, the range is
   * the row the reader is on, `from`, and it becomes the one to run from.
   */
  private selectRange(to: number, from = to): void {
    const keys = this.pageKeys
    let anchor = this.anchorKey === undefined ? -1 : keys.indexOf(this.anchorKey)
    if (anchor < 0) {
      anchor = from
      this.anchorKey = keys[from]
    }
    const next = rangeAdd([...this.chosen], keys, anchor, to)
    if (next) {
      this.requestSelected(new Set(next))
    }
  }

  /** The words a typed search matches each row by: its row header's value. */
  private get rowWords(): string[] {
    const header = this.headerColumn
    return this.drawnPage.map((row) => {
      const value = header?.order(row)
      return value === undefined || value === null ? '' : String(value)
    })
  }

  /**
   * The column whose cells head their rows: the one marked `row-header`, or
   * the first with a `field`.
   */
  private get headerColumn(): HelixHeadlessTableColumn | undefined {
    const columns = this.shownColumns
    return (
      columns.find((column) => column.rowHeader) ?? columns.find((column) => column.field !== '')
    )
  }

  /** Sends `helix-load-more`, for the button in the `more` row or a scroll near the end. */
  private askForMore(): void {
    this.dispatchEvent(new HelixLoadMoreEvent())
  }

  /**
   * Asks for more rows on its own once a reader scrolls a `windowed` table to
   * within one screen of the end, once for each number of rows it holds.
   */
  private askNearEnd(): void {
    if (!this.windowed || !this.loadMore || this.loading) {
      return
    }
    const screen = this.partNamed('table')?.clientHeight ?? 0
    const count = this.rows.length
    if (
      screen > 0 &&
      count > 0 &&
      this.askedAt !== count &&
      this.virtualize.remaining() <= screen
    ) {
      this.askedAt = count
      this.askForMore()
    }
  }

  /** Asks for one row to be chosen or let go, and makes it where a range runs from. */
  private chooseRow(key: string, checked: boolean): void {
    this.anchorKey = key
    const keys = this.chosen
    if (checked) {
      keys.add(key)
    } else {
      keys.delete(key)
    }
    this.requestSelected(keys)
  }

  /** Selects every row, or clears them all where every one already was. */
  private readonly toggleAll = (event: HelixBeforeToggleEvent): void => {
    event.preventDefault()
    this.chooseAll()
  }

  /** Asks for every row, or for none where every one already was. */
  private chooseAll(): void {
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
    const rows = this.mode === 'server' && !this.childField ? this.rows : this.flat().rows
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
        this.dispatchEvent(new HelixFilteredEvent({ value }))
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
        this.dispatchEvent(new HelixActivateEvent({ value: String(value) }))
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

  /** The sort last heard, so a render that changed nothing says nothing. */
  private heardSort: string | undefined = undefined

  /** The selection last heard, for the same reason. */
  private heardSelected: string | undefined = undefined

  /** The search last heard, for the same reason. */
  private heardFilter: string | undefined = undefined

  /**
   * What the table says after a sort or a change to the chosen rows.
   *
   * **The state changed and nothing said so.** A sort moved `aria-sort` on the
   * heading, and a reader on the heading's button is not told its column's
   * state changed; a chosen row ticked one box, and nothing gave the count. So
   * each is said in the collection's live region, once, after it has happened.
   * Whoever set it, a reader or a consumer answering `helix-sort`, since either
   * way the rows under the reader have moved. Not on the first render, which
   * is the table arriving rather than anything changing.
   */
  private news(): string {
    const sort = this.sort
    const selected = this.selectable ? this.selected : ''
    let said = this.announced
    if (this.hasUpdated && sort !== this.heardSort) {
      const parsed = parse(sort)
      const column = parsed
        ? this.tableColumns.find((one) => one.field === parsed.field)
        : undefined
      said = parsed
        ? fillTemplate(this.sortedLabel, {
            column: column?.textContent?.trim() || parsed.field,
            order: parsed.direction === 'asc' ? this.ascendingLabel : this.descendingLabel,
          })
        : this.unsortedLabel
    } else if (this.hasUpdated && selected !== this.heardSelected) {
      said = fillTemplate(this.selectedLabel, {
        count: formatNumbers(this.lang)(this.chosen.size),
      })
    } else if (this.hasUpdated && this.filter !== this.heardFilter) {
      /* A search narrows the rows under a reader who is in the search field,
         so how many it left is said. None left is the empty text, which the
         region says in place of this. */
      const count = this.mode === 'server' ? Math.max(this.total, this.rows.length) : this.matched
      said = countLabel(count, this.resultLabel, this.resultsLabel, this.lang)
    }
    this.heardSort = sort
    this.heardSelected = selected
    this.heardFilter = this.filter
    return said
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.hadFocus = this.hasUpdated && this.gridHasFocus()
    this.announced = this.news()
    hostAria(this.internals, {
      label: this.label || 'Table',
      role: this.childField ? 'treegrid' : 'grid',
    })
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
    this.internals.ariaRowCount = this.counts.rows === undefined ? null : String(this.counts.rows)
    this.internals.ariaColCount =
      this.counts.columns === undefined ? null : String(this.counts.columns)
    this.markEmpty()
    this.assign()
    this.announceSort()
    this.quietControls()
    this.placeFocus()
    /* After the rows are in the tree, so the pass that measures them is looking
       at the window this render drew. The controller holds its answer when it
       stops changing, so this settles rather than looping. */
    if (this.windowed) {
      this.virtualize.measure()
    }
    this.askNearEnd()
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
    const stop = this.currentRow(this.drawnPage) === -1 ? this.currentColumn : -1
    const offset = this.selectable ? 1 : 0
    const shown = this.shownColumns
    for (const column of this.tableColumns) {
      /* Whether a reader may move it, pushed down for the same reason: the order
         is the table's, and the grip is drawn by the column. */
      column.movable = this.reorderable && column.field !== ''
      /* A cell of this grid, and its one tab stop when the stop is on it. */
      column.gridCell = true
      column.tabStop = shown.indexOf(column) + offset === stop
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
    place: number,
    stop: boolean,
    header: boolean,
  ): TemplateResult {
    const edge = edgeOf(column.textAlign)
    /* The depth goes on the row header, which indents, and holds the toggle. */
    const placed = header && this.childField ? this.tree().placed.get(row) : undefined
    const style = [
      edge ? `--data-table-cell-align: ${edge}` : '',
      placed ? `--data-table-level: ${placed.level}` : '',
    ]
      .filter(Boolean)
      .join('; ')
    return html`<span
      part="cell${picked ? ' cell-selected' : ''}${header ? ' cell-header' : ''}"
      role=${header ? 'rowheader' : 'gridcell'}
      tabindex=${stop ? '0' : '-1'}
      data-column=${place}
      style=${style || nothing}
      >${placed?.branch ? this.renderToggle(row, placed.open) : nothing}${column.read(row)}</span
    >`
  }

  /**
   * The mark a pointer opens or closes a row of a tree grid by.
   *
   * **Hidden from assistive technology, and no button.** The row says whether
   * it is open with `aria-expanded`, and Right and Left open and close it. A
   * button in the row header put its own name, "Expand src", into the name of
   * the header that names the row.
   */
  private renderToggle(row: DataRow, open: boolean): TemplateResult {
    const glyph = open ? caretDown : caretRight
    return html`<span
      part="toggle${open ? ' toggle-open' : ''}"
      aria-hidden="true"
      @click=${() => this.toggleOpen(row, !open)}
    ><svg part="toggle-mark" ?data-mirror=${!open} fill="currentColor" viewBox=${glyph.viewBox}>${unsafeSVG(glyph.content)}</svg></span>`
  }

  /**
   * Opens or closes a row of a tree grid, and says so with `helix-expand`.
   * Nothing moves where it is that way already.
   */
  private toggleOpen(row: DataRow, open: boolean): boolean {
    const key = this.rowKeyOf(row, -1)
    const keys = this.opened
    if (keys.has(key) === open) {
      return false
    }
    if (open) {
      keys.add(key)
    } else {
      keys.delete(key)
    }
    this.expanded = [...keys].join(',')
    this.dispatchEvent(new HelixExpandEvent({ value: this.expanded }))
    return true
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
        mark-checked: checkbox-mark-checked, mark-dash: checkbox-mark-dash,
        mark-indeterminate: checkbox-mark-indeterminate"
      aria-label=${name}
      tabindex="-1"
      .checked=${checked}
      .indeterminate=${indeterminate}
      @helix-before-toggle=${toggle}
    ></${checkbox}>`
  }

  private renderRows(
    rows: readonly { index: number; row: DataRow }[],
    page: readonly DataRow[],
  ): TemplateResult {
    const columns = this.shownColumns
    /* Keyed, so a sort moves a row's element rather than rewriting every cell
       in place: focus inside a cell survives and a transition stays attached to
       the row it belongs to. The index is the fallback and is correct only
       while nothing reorders, which is why `row-key` is worth setting.

       Keyed by the row's place in the page, which a window does not change:
       keyed by its place in the window, every window would key its first row
       `0` and hand a scroll the element belonging to a row it has just left. */
    const chosen = this.selectable ? this.chosen : undefined
    const named = this.headerColumn
    const stopRow = this.currentRow(page)
    const stopColumn = this.currentColumn
    const offset = this.selectable ? 1 : 0
    return html`${repeat(
      rows,
      ({ index, row }) => this.rowKeyOf(row, index),
      ({ index, row }) => {
        const key = chosen ? this.keyOf(row, this.rowIndex(index) - 2) : ''
        const picked = chosen?.has(key) ?? false
        const placed = this.childField ? this.tree().placed.get(row) : undefined
        const stop = (place: number): boolean => index === stopRow && place === stopColumn
        /* Selected is said on the row for the accessibility tree and on each of
           its cells for a stylesheet: the row is `display: contents`, so the
           cells are what a selection is painted on, and nothing outside can
           reach a cell by the row it sits in. */
        return html`<div
          part="row"
          role="row"
          aria-rowindex=${this.rowIndex(index)}
          aria-selected=${chosen ? String(picked) : nothing}
          aria-level=${placed ? placed.level : nothing}
          aria-posinset=${placed ? placed.position : nothing}
          aria-setsize=${placed ? placed.siblings : nothing}
          aria-expanded=${placed?.branch ? String(placed.open) : nothing}
          data-index=${this.windowed ? index : nothing}
          data-row=${index}
        >
          ${
            chosen
              ? html`<span
                  part="select${picked ? ' select-selected' : ''}"
                  role="gridcell"
                  tabindex=${stop(0) ? '0' : '-1'}
                  data-column="0"
                  >${this.renderCheckbox(
                    fillTemplate(this.selectRowLabel, {
                      row: named ? String(named.order(row) ?? key) : key,
                    }),
                    picked,
                    false,
                    (event) => this.toggleRow(key, event),
                  )}</span
                >`
              : nothing
          }${columns.map((column, place) =>
            this.renderCell(
              column,
              row,
              picked,
              place + offset,
              stop(place + offset),
              column === named,
            ),
          )}
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
   * `within` is the row's place in the page, which already counts the window.
   */
  private rowIndex(within: number): number {
    const size = this.pageSize
    const page = size > 0 ? (this.page - 1) * size : 0
    return page + within + 2
  }

  /**
   * What decides which row is at which index, as one comparable value.
   *
   * Not the rows themselves: those are compared by identity beside this, and a
   * consumer handing back an equal array is handing back the same rows in the
   * same order whatever object it is.
   */
  private get placement(): string {
    return [
      this.mode,
      this.filter,
      this.sort,
      this.page,
      this.pageSize,
      this.childField,
      this.expanded,
    ].join('\u0000')
  }

  /** The signature the recorded heights were measured against. */
  private measuredAgainst = ''

  /**
   * The room the rows outside the window would have taken.
   *
   * **`role="presentation"`, because this is geometry standing inside a
   * `rowgroup`.** A bare `div` there is a child the role does not allow, and a
   * screen reader walking the rows would meet something that is not one. The
   * room itself is what keeps the scrollbar honest: a box that scrolls twenty
   * rows while claiming ten thousand gives a thumb the size of its track.
   */
  private renderSpacer(
    end: 'after' | 'before',
    kept: number | undefined,
  ): TemplateResult | typeof nothing {
    if (!this.windowed) {
      return nothing
    }
    /* The row kept for the tab stop takes its own room out of the spacer on
       its side, so the rows in the window stay where the spacer put them. */
    const { after, before } = this.virtualize.spacers(kept)
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
      this.askNearEnd()
    }
  }

  /** The heading of the checkbox column, which selects the whole result. */
  private renderSelectAll(stop: boolean): TemplateResult {
    const every = this.everyKey
    const keys = this.chosen
    const count = every.filter((key) => keys.has(key)).length
    return html`<span
      part="select-all"
      role="columnheader"
      tabindex=${stop ? '0' : '-1'}
      data-column="0"
    >${this.renderCheckbox(
      this.selectAllLabel,
      every.length > 0 && count === every.length,
      count > 0 && count < every.length,
      this.toggleAll,
    )}</span>`
  }

  /**
   * The row after the last one, holding the button that asks for more rows.
   *
   * A row of the grid, one cell spanning every column, so the arrows reach it
   * after the last row and Enter or Space on it asks.
   */
  private renderMore(page: readonly DataRow[]): TemplateResult | typeof nothing {
    if (!this.moreDrawn) {
      return nothing
    }
    const stop = this.currentRow(page) === page.length
    return html`<div part="more" role="row" aria-rowindex=${this.rowIndex(page.length)} data-row=${page.length}>
      <span
        part="more-cell"
        role="gridcell"
        aria-colspan=${this.width}
        tabindex=${stop ? '0' : '-1'}
        data-column="0"
        ><button part="more-button" type="button" tabindex="-1" @click=${this.askForMore}>${this.loadMoreLabel}</button></span
      >
    </div>`
  }

  protected override render(): TemplateResult {
    const { available, matched, page } = this.view
    this.drawnPage = page
    /* After the rows, while there are rows to follow and none are on their way. */
    this.moreDrawn = this.loadMore && !this.loading && page.length > 0
    const rows = this.windowOf(page)
    const kept = this.keptRow(page)
    const headStop = this.currentRow(page) === -1
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
    /* **On the grid, which is the host.** `aria-rowcount` and `aria-colcount`
       belong to a table or a grid and mean nothing on a `rowgroup`, which is
       where they sat, so a windowed or paged result never said how long it
       was. Written in `updated`, the internals being no part of the render. */
    this.counts = {
      columns: columns.length ? columns.length + (this.selectable ? 1 : 0) : undefined,
      rows: countKnown ? counted + 1 + (this.moreDrawn ? 1 : 0) : undefined,
    }
    return html`<div part="toolbar"><slot name="toolbar"></slot></div>
      <div
        part="table"
        role="rowgroup"
        aria-busy=${this.loading ? 'true' : nothing}
        style=${template ? `--data-table-template: ${template}` : nothing}
        @scroll=${this.handleScroll}
      >
        <div part="head" role="row" aria-rowindex="1">
          ${this.selectable ? this.renderSelectAll(headStop && this.currentColumn === 0) : nothing}${
            this.assignsByName && !this.hydrating
              ? this.orderedColumns.map(
                  (_, index) =>
                    html`<slot name=${`column-${index + 1}`} @slotchange=${this.handleSlotChange}></slot>`,
                )
              : html`<slot name="columns" @slotchange=${this.handleSlotChange}></slot>`
          }
        </div>
        ${this.renderSpacer('before', kept)}${this.renderRows(rows, page)}${this.renderSpacer('after', kept)}
        ${this.renderMore(page)}${this.renderStatus(filled, 'gridcell')}
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
              label=${this.paginationLabel}
              gap-label=${this.gapLabel}
              next-label=${this.nextLabel}
              page-label=${this.pageLabel}
              previous-label=${this.previousLabel}
              @helix-navigate=${this.handleNavigate}
              @helix-activate=${this.stopPageNotification}
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
    this.addEventListener('pointerdown', this.notePress, true)
    this.addEventListener('keydown', this.notePress, true)
    this.addEventListener('focusin', this.handleFocusIn)
    this.addEventListener('keydown', this.handleGridKey)
    this.addEventListener('keydown', this.handleGripKey)
    this.addEventListener('pointerdown', this.handleGripDown)
    this.addEventListener('helix-before-resize', this.handleResize)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('click', this.handleHeadClick)
    this.removeEventListener('pointerdown', this.notePress, true)
    this.removeEventListener('keydown', this.notePress, true)
    this.removeEventListener('focusin', this.handleFocusIn)
    this.removeEventListener('keydown', this.handleGridKey)
    this.removeEventListener('keydown', this.handleGripKey)
    this.removeEventListener('pointerdown', this.handleGripDown)
    this.removeEventListener('helix-before-resize', this.handleResize)
    this.stopDrag()
  }

  /**
   * Notes whether Shift is held, before the press reaches a checkbox, whose
   * request carries only the state it asks for.
   */
  private readonly notePress = (event: KeyboardEvent | PointerEvent): void => {
    this.shiftPressed = event.shiftKey
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

  /**
   * The cell at a place in the grid. The headings are row `-1`, the rows of
   * the page count from 0, and the checkbox column, where there is one, is
   * column 0.
   */
  private cellAt(row: number, column: number): HTMLElement | null {
    const offset = this.selectable ? 1 : 0
    if (row === -1) {
      return column < offset
        ? this.partNamed('select-all')
        : (this.shownColumns[column - offset]?.cellBox ?? null)
    }
    if (this.moreDrawn && row === this.drawnPage.length) {
      /* One cell spans the row, so every column lands on it. */
      return this.partNamed('more-cell')
    }
    const line = this.renderRoot.querySelector(`[part="row"][data-row="${row}"]`)
    return line?.querySelector<HTMLElement>(`:scope > [data-column="${column}"]`) ?? null
  }

  /** The cell an event came from or through, and its place in the grid. */
  private placeOf(event: Event): { cell: HTMLElement; column: number; row: number } | undefined {
    const columns = this.shownColumns
    const offset = this.selectable ? 1 : 0
    for (const node of event.composedPath()) {
      if (node === this) {
        break
      }
      if (!(node instanceof HTMLElement)) {
        continue
      }
      const index = columns.indexOf(node as HelixHeadlessTableColumn)
      if (index >= 0) {
        const cell = (node as HelixHeadlessTableColumn).cellBox
        return cell ? { cell, column: index + offset, row: -1 } : undefined
      }
      const role = node.getAttribute('role')
      if (
        node.dataset.column !== undefined &&
        (role === 'gridcell' || role === 'columnheader' || role === 'rowheader') &&
        node.getRootNode() === this.renderRoot
      ) {
        const line = node.parentElement?.dataset.row
        return {
          cell: node,
          column: Number(node.dataset.column),
          row: line === undefined ? -1 : Number(line),
        }
      }
    }
    return undefined
  }

  /**
   * The controls inside a cell, in order: what Enter and F2 move into, and
   * what Tab moves between while focus is in the cell.
   */
  private controlsIn(place: { cell: HTMLElement; column: number; row: number }): HTMLElement[] {
    const offset = this.selectable ? 1 : 0
    if (place.row === -1 && place.column >= offset) {
      return this.shownColumns[place.column - offset]?.controls ?? []
    }
    return [...place.cell.querySelectorAll<HTMLElement>('*')].filter(isControl)
  }

  /**
   * Takes the controls a consumer's `cell` drew out of the tab order, so the
   * grid stays one tab stop. They are reached with Enter or F2.
   */
  private quietControls(): void {
    const offset = this.selectable ? 1 : 0
    const drawn = this.shownColumns
    const read = new Set(drawn.flatMap((column, place) => (column.cell ? [place + offset] : [])))
    if (read.size === 0) {
      return
    }
    for (const cell of this.renderRoot.querySelectorAll<HTMLElement>('[part~="cell"]')) {
      if (!read.has(Number(cell.dataset.column))) {
        continue
      }
      for (const control of cell.querySelectorAll<HTMLElement>('*')) {
        if (isControl(control) && control.getAttribute('tabindex') !== '-1') {
          control.setAttribute('tabindex', '-1')
        }
      }
    }
  }

  /** Moves the tab stop to a cell, and focus with it on the next render. */
  private moveTo(row: number, column: number): void {
    const page = this.drawnPage
    this.activeRow = row
    this.activeColumn = column
    this.activeKey =
      row >= 0 && this.rowKey && page[row] ? this.rowKeyOf(page[row] as DataRow, row) : undefined
    this.focusWanted = true
  }

  /** How many rows Page Up and Page Down move: those that fit in view, less one. */
  private pageStep(cell: HTMLElement): number {
    const box = this.partNamed('table')
    const tall = cell.getBoundingClientRect().height || this.estimate
    const scrolls = box !== null && box.scrollHeight > box.clientHeight + 1
    const room = scrolls ? box.clientHeight - this.headHeight() : window.innerHeight
    return Math.max(1, Math.floor(room / tall) - 1)
  }

  /** How tall the headings are, which stick over the rows in a windowed table. */
  private headHeight(): number {
    return this.cellAt(-1, 0)?.getBoundingClientRect().height ?? 0
  }

  /** Whether focus is on a cell of the grid, or inside one. */
  private gridHasFocus(): boolean {
    const active = deepActiveElement()
    const grid = this.partNamed('table')
    if (!active || !grid) {
      return false
    }
    return (
      deepContains(grid, active) || this.shownColumns.some((column) => deepContains(column, active))
    )
  }

  /** Whether focus was in the grid before this render, for `placeFocus` to keep it there. */
  private hadFocus = false

  /**
   * Focuses the cell holding the tab stop, where a key asked to move there or
   * a render took focus away from the grid.
   *
   * **A render can take focus away**: a sort moves the row elements, and a
   * moved element loses focus to the body. Put back on the cell the stop is on,
   * which follows the row by its key.
   */
  private placeFocus(): void {
    const lost =
      this.hadFocus &&
      !this.gridHasFocus() &&
      (document.activeElement === null || document.activeElement === document.body)
    if (!this.focusWanted && !lost) {
      return
    }
    const row = this.currentRow(this.drawnPage)
    const target = this.cellAt(row, this.currentColumn)
    if (!target) {
      return
    }
    this.focusWanted = false
    if (!this.windowed) {
      target.focus()
      return
    }
    target.focus({ preventScroll: true })
    const kept = this.keptRow(this.drawnPage)
    if (row >= 0 && kept === row) {
      /* Drawn beside the window, away from where it belongs, so its box is
         the wrong place to scroll to: the window is moved to the row, which
         stays the same element when the window arrives. */
      this.virtualize.reveal(row, this.headHeight())
      return
    }
    const box = this.partNamed('table')
    if (!box) {
      return
    }
    const frame = box.getBoundingClientRect()
    const rect = target.getBoundingClientRect()
    const top = row === -1 ? frame.top : frame.top + this.headHeight()
    if (rect.top < top) {
      box.scrollTop -= top - rect.top
    } else if (rect.bottom > frame.bottom) {
      box.scrollTop += rect.bottom - frame.bottom
    }
    if (rect.left < frame.left) {
      box.scrollLeft -= frame.left - rect.left
    } else if (rect.right > frame.right) {
      box.scrollLeft += rect.right - frame.right
    }
  }

  /** A cell, or a control inside one, took focus: the tab stop moves there. */
  private readonly handleFocusIn = (event: FocusEvent): void => {
    const place = this.placeOf(event)
    if (!place) {
      return
    }
    /* Tab back into a grid whose stop was kept outside the window: the window
       moves to the row, which stays the same element when it arrives. */
    if (place.row >= 0 && this.keptRow(this.drawnPage) === place.row) {
      this.virtualize.reveal(place.row, this.headHeight())
    }
    /* Set even where it is the stop already, which at rest is only where the
       window starts: written down, it stays with the row as the window moves. */
    if (
      this.activeRow === undefined ||
      place.row !== this.currentRow(this.drawnPage) ||
      place.column !== this.currentColumn
    ) {
      const page = this.drawnPage
      this.activeRow = place.row
      this.activeColumn = place.column
      this.activeKey =
        place.row >= 0 && this.rowKey && page[place.row]
          ? this.rowKeyOf(page[place.row] as DataRow, place.row)
          : undefined
    }
  }

  /**
   * The grid's keys, on a cell and inside one.
   *
   * On a cell, the arrows, Home, End, Page Up and Page Down move between
   * cells, and Enter, Space and F2 act on it. Inside a cell the control has the
   * keys, apart from Escape and F2, which go back to the cell, and Tab, which
   * moves between the cell's controls. A key a control already handled is left
   * alone.
   */
  private readonly handleGridKey = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.altKey) {
      return
    }
    const place = this.placeOf(event)
    if (!place) {
      return
    }
    if (event.composedPath()[0] !== place.cell) {
      this.handleControlKey(event, place)
      return
    }
    const last = this.drawnPage.length - 1 + (this.moreDrawn ? 1 : 0)
    const edge = this.width - 1
    const control = event.ctrlKey || event.metaKey
    if (control && !event.shiftKey && event.key.toLowerCase() === 'a' && this.selectable) {
      event.preventDefault()
      this.requestSelected(new Set([...this.chosen, ...this.everyKey]))
      return
    }
    /* A letter searches the row headers. A Space is part of a search under
       way, and otherwise selects. */
    if (typesCharacter(event) && (event.key !== ' ' || this.typeahead.typing())) {
      const found = this.typeahead.match(event.key, this.rowWords, place.row)
      if (found >= 0) {
        event.preventDefault()
        this.moveTo(found, place.column)
      }
      return
    }
    let { column, row } = place
    switch (event.key) {
      case 'ArrowUp':
        row = Math.max(-1, row - 1)
        break
      case 'ArrowDown':
        row = Math.min(last, row + 1)
        break
      case 'ArrowLeft':
      case 'ArrowRight':
        if (this.treeKey(event, place)) {
          return
        }
        column = Math.max(0, Math.min(edge, column + inlineStep(this, event.key)))
        break
      case 'Home':
        row = control ? -1 : row
        column = 0
        break
      case 'End':
        row = control ? Math.max(row, last) : row
        column = edge
        break
      case 'PageUp':
        row = Math.max(-1, row - this.pageStep(place.cell))
        break
      case 'PageDown':
        row = Math.min(last, row + this.pageStep(place.cell))
        break
      case 'Enter':
      case ' ':
      case 'F2':
        this.activate(event, place)
        return
      default:
        return
    }
    event.preventDefault()
    /* Shift with Up or Down takes the rows it crosses into the selection. */
    if (
      event.shiftKey &&
      this.selectable &&
      (event.key === 'ArrowUp' || event.key === 'ArrowDown') &&
      place.row >= 0 &&
      row >= 0 &&
      row < this.drawnPage.length
    ) {
      this.selectRange(row, place.row)
    }
    if (row !== place.row || column !== place.column) {
      this.moveTo(row, column)
    }
  }

  /**
   * Left and Right on a row header of a tree grid: forward opens a closed row,
   * back closes an open one, and back on a child moves to its parent. Says
   * whether it took the key, and the arrows move between cells where it did not.
   */
  private treeKey(
    event: KeyboardEvent,
    place: { cell: HTMLElement; column: number; row: number },
  ): boolean {
    const row = this.drawnPage[place.row]
    const header = this.headerColumn
    if (!this.childField || !row || !header) {
      return false
    }
    if (place.column !== this.shownColumns.indexOf(header) + (this.selectable ? 1 : 0)) {
      return false
    }
    const placed = this.tree().placed.get(row)
    const forward = inlineStep(this, event.key) > 0
    if (placed?.branch && placed.open !== forward) {
      event.preventDefault()
      this.toggleOpen(row, forward)
      return true
    }
    const parent = placed?.parent ? this.drawnPage.indexOf(placed.parent) : -1
    if (!forward && parent >= 0) {
      event.preventDefault()
      this.moveTo(parent, place.column)
      return true
    }
    return false
  }

  /** Enter, Space and F2 on a cell. */
  private activate(
    event: KeyboardEvent,
    place: { cell: HTMLElement; column: number; row: number },
  ): void {
    const offset = this.selectable ? 1 : 0
    const heading = place.row === -1 ? this.shownColumns[place.column - offset] : undefined
    if (this.moreDrawn && place.row === this.drawnPage.length && event.key !== 'F2') {
      event.preventDefault()
      this.askForMore()
      return
    }
    if (event.key !== 'F2') {
      if (heading?.canSort) {
        event.preventDefault()
        this.toggleSort(heading.field)
        return
      }
      if (this.selectable && place.column === 0 && place.row === -1) {
        event.preventDefault()
        this.chooseAll()
        return
      }
      if (event.key === ' ') {
        const row = this.drawnPage[place.row]
        if (this.selectable && row && event.shiftKey && this.anchorKey !== undefined) {
          event.preventDefault()
          this.selectRange(place.row)
        } else if (this.selectable && row) {
          event.preventDefault()
          const key = this.keyOf(row, this.rowIndex(place.row) - 2)
          this.chooseRow(key, !this.chosen.has(key))
        }
        return
      }
    }
    const first = this.controlsIn(place)[0]
    if (first) {
      event.preventDefault()
      first.focus()
    }
  }

  /** The keys the grid takes while focus is on a control inside a cell. */
  private handleControlKey(
    event: KeyboardEvent,
    place: { cell: HTMLElement; column: number; row: number },
  ): void {
    if (event.key === 'Escape' || event.key === 'F2') {
      event.preventDefault()
      place.cell.focus()
      return
    }
    if (event.key !== 'Tab') {
      return
    }
    const origin = event.composedPath()[0] as Node
    const controls = this.controlsIn(place)
    const at = controls.findIndex((one) => deepContains(one, origin))
    const next = controls[at + (event.shiftKey ? -1 : 1)]
    if (at >= 0 && next) {
      event.preventDefault()
      next.focus()
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
   * The composed pagination's notification, stopped for the reason its
   * request is: this element sends its own `helix-activate` once its own page
   * has moved, and one move is one event.
   */
  private readonly stopPageNotification = (event: Event): void => {
    event.stopPropagation()
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
