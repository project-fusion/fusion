import {
  AriaForwardController,
  commaList,
  customElement,
  fillTemplate,
  type HelixBeforeToggleEvent,
  HelixElement,
  HelixSelectEvent,
  HelixSelectedEvent,
  HelixSortEvent,
  HelixSortedEvent,
  MixinCollection,
  reflectElements,
  requestChange,
  splitValues,
  whenHydrated,
} from '@fusion.dev/helix-core'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
/* `static-html`'s `html`, because the checkbox's tag is interpolated. */
import { html } from 'lit/static-html.js'
import '../../checkbox/index.js'
import { cycle, type DataRow, format, parse, sort } from '../../data-table/root/order.js'
import { edgeOf, type HelixHeadlessTableColumn } from '../column/table-column.js'
import type { HelixHeadlessTableRow } from '../row/table-row.js'

/** A row as the table reads it: the consumer's element, a table row where it is one. */
type Row = Element & Partial<HelixHeadlessTableRow>

/**
 * The first `wanted` tracks of a track list, one entry each, so every declared
 * column can take the one in its place.
 *
 * Split on the spaces between tracks and never inside a function, so
 * `minmax(0, 1fr)` stays one track. A `repeat()` with a count is that many
 * tracks, written out; an automatic one names no count and yields none. Line
 * names go with the track after them.
 *
 * Everything above the split is a fact about a grid track list rather than
 * about a value list, which is why only the split itself is shared.
 *
 * **A track the grid would refuse yields nothing either**, where the platform
 * can say. One invalid track makes the whole `grid-template-columns` invalid,
 * which a grid ignores in silence and draws as one column. That is the failure
 * that once had `columns` deprecated, a list of headings handed over as widths,
 * and dealt out a track at a time it costs the one column its width and no
 * more.
 */
const tracksOf = (list: string, wanted: number): string[] => {
  const words = splitValues(list, ' ')
  const valid = (track: string): boolean =>
    typeof CSS === 'undefined' || CSS.supports('grid-template-columns', track)
  const tracks: string[] = []
  let names = ''
  for (const one of words) {
    if (tracks.length >= wanted) {
      break
    }
    if (one.startsWith('[')) {
      names += `${one} `
      continue
    }
    const repeat = /^repeat\(\s*(\d+)\s*,(.*)\)$/is.exec(one)
    if (repeat) {
      const inner = tracksOf(repeat[2] ?? '', wanted)
      for (let time = 0; time < Number(repeat[1]) && tracks.length < wanted; time += 1) {
        tracks.push(
          ...inner.map((track, index) => (time === 0 && index === 0 ? names + track : track)),
        )
      }
    } else if (!/^repeat\(/i.test(one)) {
      tracks.push(valid(names + one) ? names + one : '')
    }
    names = ''
  }
  return tracks.slice(0, wanted)
}

/**
 * The most characters a column may hold at its widest and still never wrap.
 *
 * Set from what tables actually hold: `--helix-color-background` is 24
 * characters and `@fusion.dev/helix-headless` is 26, and both are values a
 * reader copies whole. Above this a column is carrying a sentence, and
 * wrapping is the only thing it can do.
 */
const SHORT = 32

/**
 * The least room a column of sentences is given before the table scrolls.
 *
 * **Never `0`.** A zero floor lets a track vanish: measured at a 900 pixel
 * viewport, a `max-content` name column asking for 250 starved two columns of
 * sentences to exactly `0px` and wrapped their text to forty-eight lines. A
 * floor turns that into an overflow, which the table's own box scrolls.
 */
const FLOOR = '14ch'

/**
 * How many rows are read to size the columns.
 *
 * Enough for the text a table holds to show its shape, and a ceiling on the
 * work a render does for a table of thousands of rows.
 */
const SAMPLE = 200

/** An element's text as a reader sees it, with the markup's indentation folded away. */
const textOf = (element: Element | undefined): string =>
  (element?.textContent ?? '').replace(/\s+/g, ' ').trim()

const lengthOf = (element: Element | undefined): number => textOf(element).length

/** A cell's text as a number, with the commas that group its digits taken out. */
const numberOf = (value: string): number => Number(value.replaceAll(',', ''))

/**
 * @summary A table of data, laid out on a grid.
 *
 * @description
 * Lays out the rows on a CSS grid, so every column lines up across rows and
 * each row stays a real element that can be styled, hidden, or made
 * interactive. A `<table>` layout aligns columns but limits almost everything
 * else.
 *
 * A grid of elements has no table structure for assistive technology, so the
 * roles are set explicitly: `table`, `row`, `cell`, `columnheader`, and
 * `rowheader` for a `header` cell in a row of values. Rows are
 * `display: contents`, so their cells become items of the one grid.
 *
 * A column with `sortable` and a `field` sorts the rows by the text of its
 * cells, numbers by their value. Your markup is not reordered: the table draws
 * the rows in the sorted order. `helix-sort` asks first, so you can refuse it
 * and reorder the rows yourself.
 *
 * The `heading` slot names the table: slot a heading or a line of text into
 * it, and the table is named by its words. An `aria-label` or `aria-labelledby` on the
 * host wins over it.
 *
 * `selectable` adds a column of checkboxes. Each row is known by its `value`,
 * and `selected` holds the chosen keys, comma separated, the same shape
 * `DataTable` uses. The checkbox in the heading selects every row. For a grid
 * a reader moves through with the arrow keys, with typeahead and range
 * selection, use `DataTable`. To act on one row, put a link or a button in a
 * cell.
 *
 * The CSS custom properties listed for this component are written by it and
 * read by the stylesheet that draws it. Do not set them. Each holds a number
 * the component computes and CSS cannot, so the stylesheet can draw the table
 * without measuring anything.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases DataTable, Grid table
 * @documentation https://fusion.dev/helix/components/table
 *
 * @slot - The table's rows.
 * @slot heading - Words that name the table, shown above it, such as a heading.
 *
 * @event {HelixSelectEvent} helix-select - The selection is about to change. The event carries every selected key, separated by commas. Cancelable: cancel it to keep the current selection.
 * @event {HelixSelectedEvent} helix-selected - Fired after the selection changes, with every selected key, separated by commas.
 * @event {HelixSortEvent} helix-sort - A different sort order was requested, as `field:direction`, or empty for the order the rows were written in. Cancelable: cancel it to keep the current order.
 * @event {HelixSortedEvent} helix-sorted - Fired after the sort order changes, with the new order.
 *
 * @csspart checkbox - The checkbox in the heading that selects every row, in a `selectable` table.
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
 * @csspart empty - The text shown when there are no rows.
 * @csspart head - The row that holds the column headings. It has `display: contents`, so it takes no space of its own.
 * @csspart live - A live region that repeats the empty and loading text, so screen readers announce it when it changes. Visually hidden in the styled tier.
 * @csspart loading - The text shown while the rows are loading.
 * @csspart select-all - The heading that holds the checkbox that selects every row.
 * @csspart table - The grid.
 *
 * @cssproperty --table-template - The column track list the table works out from its columns. The component writes it inline on the element that reads it, so setting it has no effect. Set `columns` to change the tracks.
 */
@customElement('helix-headless-table')
export class HelixHeadlessTable extends MixinCollection(HelixElement) {
  /** The word for an ascending sort, in `sorted-label`. */
  @property({ attribute: 'ascending-label' })
  ascendingLabel = 'ascending'

  /**
   * The column widths as one track list, written once on the table.
   *
   * With `TableColumn` children, each track sizes the column in its place, a
   * hidden column counted, so hiding one takes its track with it and the rest
   * keep theirs. The columns decide how many tracks there are and this list
   * only how wide: a track past the last column is dropped, and a column past
   * the last track shares what is left. With no columns declared it is the
   * whole track list. Tracks count as the grid counts them, so `minmax(0, 1fr)`
   * is one and `repeat(2, 8rem)` is two, and one the grid would refuse leaves
   * its column at the default rather than taking the table down to one column.
   *
   * **A column's own `width` wins over its track here.** The width is written
   * on the column it sizes, which is the more particular statement, and it is
   * where a resize lands: a reader dragging a column's edge writes `width`, so
   * were this list to win, the drag would move the separator and leave the
   * track where the list put it. This is the table's default for its columns,
   * and each column may say otherwise.
   *
   * **It is also the only track list a server can send.** The shim has no tree
   * to walk, so a render there knows of no columns and this attribute is the
   * whole answer: a table given one lays its grid out in the first paint, and a
   * table sized only by its columns is one track wide until it upgrades.
   *
   * **Data Table has none of this, and should not.** Its columns are its schema
   * rather than an option, so there is always a column to write a `width` on
   * and a list here would be a second way to say what that says. This table's
   * cells are markup, and a table written as rows of cells with no column
   * declared in it has nowhere else to be sized from.
   */
  @property()
  columns = ''

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
   * Accessible name for the table.
   *
   * An `aria-label` or `aria-labelledby` on the host names the table too, and
   * wins over this.
   */
  @property()
  label = ''

  /**
   * Adds a column of checkboxes for selecting rows. Each row is known by its
   * `value`, and by its place among the rows as written where it has none.
   */
  @property({ type: Boolean })
  selectable = false

  /** The name of the checkbox in the heading that selects every row. */
  @property({ attribute: 'select-all-label' })
  selectAllLabel = 'Select every row'

  /**
   * The keys of the selected rows, separated by commas.
   *
   * A reader's press fires `helix-select` first, and refusing it leaves the
   * selection as it was. `default-selected` seeds a selection this element
   * then owns.
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
   * The name of a row's checkbox. `{row}` is replaced with the words of the
   * row's first cell.
   */
  @property({ attribute: 'select-row-label' })
  selectRowLabel = 'Select {row}'

  /**
   * The sort order, as `field:direction`, where `field` is a sortable column's
   * `field`.
   *
   * The rows are compared by the text of their cells in that column, numbers by
   * their value. A reader's click on a sortable heading fires `helix-sort`
   * first, and refusing it leaves the order as it was. `default-sort` seeds an
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

  /** What screen readers hear when the table stops being sorted. */
  @property({ attribute: 'unsorted-label' })
  unsortedLabel = 'Not sorted'

  @state()
  private sortState: string | undefined = undefined

  @state()
  private selectedState: string | undefined = undefined

  /** Whether the heading names the table, so taking it away clears only this element's own name. */
  private headed = false

  /**
   * Carries a host `aria-label` and `aria-labelledby` to the grid, which is
   * the element with the `table` role.
   *
   * A heading the table is named by is the consumer's markup, beside the
   * host, and an IDREF on the host named a generic wrapper while the table
   * itself kept its default name.
   */
  protected readonly aria = new AriaForwardController(this, {
    label: true,
    target: () => this.partNamed('table'),
  })

  /**
   * Asks for a different order, and reports whether the request stood.
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

  /**
   * Cycles the sort order of one column, as a click on its heading does.
   *
   * Ascending, descending, then the order the rows were written in.
   */
  toggleSort(field: string): boolean {
    return this.requestSort(format(cycle(parse(this.sort), field)))
  }

  /**
   * The rows in the order they are drawn: sorted by `sort`, and as written
   * where there is no sort.
   *
   * **Drawn in order by assignment.** A manually assigned slot draws its nodes
   * in the order they were assigned, so the rows move on screen and in the
   * accessibility tree while the consumer's markup stays as it was written,
   * which is what a framework holding those rows needs.
   */
  private get arrangedRows(): Element[] {
    const rows = this.slotted
    const spec = parse(this.sort)
    const declared = this.tableColumns
    const index = spec
      ? declared.findIndex((column) => column.canSort && column.field === spec.field)
      : -1
    if (!spec || index < 0) {
      return rows
    }
    const records = rows.map((element) => ({ element, value: textOf(element.children[index]) }))
    /* A column of numbers compares as numbers, so `980` comes before `1,204`
       and a negative sorts below zero. A column with any word in it collates
       as text, digits by their value. */
    const numeric = records.every(({ value }) => value === '' || Number.isFinite(numberOf(value)))
    const order = numeric
      ? (row: DataRow): unknown => (row.value === '' ? '' : numberOf(row.value as string))
      : (row: DataRow): unknown => row.value
    const sorted = sort(records, spec, [{ field: spec.field, order }]) as unknown as typeof records
    return sorted.map((record) => record.element)
  }

  /** The sort last heard, so a render that changed nothing says nothing. */
  private heardSort: string | undefined = undefined

  /**
   * What the table says after a sort, once, in the collection's live region.
   *
   * A reader on a heading's button is not told that `aria-sort` moved, so the
   * new order is said. Not on the first render, which is the table arriving.
   */
  private news(): string {
    const current = this.sort
    let said = this.announced
    if (this.hasUpdated && current !== this.heardSort) {
      const parsed = parse(current)
      const column = parsed
        ? this.tableColumns.find((one) => one.field === parsed.field)
        : undefined
      said = parsed
        ? fillTemplate(this.sortedLabel, {
            column: column?.textContent?.trim() || parsed.field,
            order: parsed.direction === 'asc' ? this.ascendingLabel : this.descendingLabel,
          })
        : this.unsortedLabel
    }
    this.heardSort = current
    const selected = this.selectable ? this.selected : ''
    if (this.hasUpdated && current === this.heardSortBefore && selected !== this.heardSelected) {
      said = fillTemplate(this.selectedLabel, { count: this.chosen.size })
    }
    this.heardSortBefore = current
    this.heardSelected = selected
    return said
  }

  /** The sort as the last render had it, so a selection said beside a sort waits. */
  private heardSortBefore: string | undefined = undefined

  /** The selection last heard, so a render that changed nothing says nothing. */
  private heardSelected: string | undefined = undefined

  /** The rows as written, each with the key `selected` lists it by. */
  private get keyed(): { key: string; row: Row }[] {
    return this.slotted.map((row, index) => ({
      key: (row as Row).value || String(index),
      row: row as Row,
    }))
  }

  /** The keys selected now. */
  private get chosen(): Set<string> {
    return new Set(commaList(this.selected))
  }

  /** Asks for a different set of selected rows, and reports whether the request stood. */
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

  /**
   * A checkbox this table drew asked to change: a row's, or the one in the
   * heading. Refused, and asked of the selection instead, so a box shows only
   * what `selected` says. A checkbox a consumer put in a cell is theirs and is
   * left alone.
   */
  private readonly handleToggle = (event: HelixBeforeToggleEvent): void => {
    const origin = event.composedPath()[0]
    if (!(origin instanceof Element) || origin.getAttribute('part') !== 'checkbox') {
      return
    }
    const root = origin.getRootNode()
    const keys = this.chosen
    if (root === this.renderRoot) {
      event.preventDefault()
      const every = this.keyed.map(({ key }) => key)
      const all = every.length > 0 && every.every((key) => keys.has(key))
      for (const key of every) {
        if (all) {
          keys.delete(key)
        } else {
          keys.add(key)
        }
      }
      this.requestSelected(keys)
      return
    }
    const found = this.keyed.find(({ row }) => row.shadowRoot === root)
    if (!found) {
      return
    }
    event.preventDefault()
    if (event.detail.checked) {
      keys.add(found.key)
    } else {
      keys.delete(found.key)
    }
    this.requestSelected(keys)
  }

  /**
   * Tells each row whether it is selected and what its checkbox is called.
   *
   * Pushed down for the reason the sort is: the selection is the table's, and
   * the checkbox is drawn by the row.
   */
  private markSelected(): void {
    const keys = this.chosen
    for (const { key, row } of this.keyed) {
      if (!row.isTableRow) {
        continue
      }
      const label = fillTemplate(this.selectRowLabel, { row: textOf(row.children[0]) || key })
      /* Not into a row still hydrating what a server sent: see `whenHydrated`.
         A server cannot tell a row it is in a selectable table, so it serves no
         checkbox cell, and one written into the hydrating render is a template
         where the server's markup has none, which Lit refuses. */
      whenHydrated(row, () => {
        row.selectable = this.selectable
        row.selected = keys.has(key)
        row.selectLabel = label
      })
    }
  }

  /**
   * Names the table by its heading, where the host names it no other way.
   *
   * Through element reflection, because the heading is the consumer's markup
   * and the table is in this shadow root, which an id cannot reach across.
   */
  private nameByHeading(): void {
    const named = this.hasAttribute('aria-label') || this.hasAttribute('aria-labelledby')
    this.headed = reflectElements(
      this.partNamed('table'),
      'ariaLabelledByElements',
      named ? [] : this.headings,
      this.headed,
    )
  }

  /** What the heading slot is given. */
  private get headings(): Element[] {
    return [...(this.children ?? [])].filter((child) => child.getAttribute('slot') === 'heading')
  }

  /**
   * Tells each column which way it is ordered, if it is the one.
   *
   * The table owns the sort and the column carries `aria-sort`, the same
   * arrangement `DataTable` has.
   */
  private markSorted(): void {
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

  /**
   * A click on a sortable heading's button.
   *
   * Enter and Space arrive here too, as the click the button makes of them.
   * Only the button sorts: a click on a column's separator is a resize.
   */
  private readonly handleHeadClick = (event: Event): void => {
    const path = event.composedPath()
    if (!path.some((node) => node instanceof Element && node.getAttribute('part') === 'sort')) {
      return
    }
    const columns = this.tableColumns
    const column = path.find((node): node is HelixHeadlessTableColumn =>
      columns.includes(node as HelixHeadlessTableColumn),
    )
    if (column?.canSort) {
      this.toggleSort(column.field)
    }
  }

  /** The columns declared as children, in the order they are written. */
  get tableColumns(): HelixHeadlessTableColumn[] {
    /* Read during `render`, through `template`, so it answers what a render may
       know: nothing on a server, whose shim has no tree, and nothing while
       hydrating what one sent. */
    return this.knownChildren.filter(
      (child): child is HelixHeadlessTableColumn =>
        'isTableColumn' in child && child.isTableColumn === true,
    )
  }

  /**
   * The track list, from the columns if there are any.
   *
   * Read from the DOM rather than kept, so adding or removing a column needs
   * nothing else to be told. A hidden column takes no track: left in, the
   * header row had a heading fewer than the grid had tracks, the first cell
   * filled the gap, and every row after it began a column late. Falls back to
   * the `columns` string for a table that declares no columns, and to a single
   * track for one that declares neither.
   */
  private get template(): string {
    const tracks = this.tracks
    /* The checkboxes take what they need and no more, ahead of everything. */
    return this.selectable && tracks ? `max-content ${tracks}` : tracks
  }

  /** The tracks of the columns, before any checkbox column. */
  private get tracks(): string {
    const declared = this.tableColumns
    if (declared.length === 0) {
      return this.columns
    }
    const listed = tracksOf(this.columns, declared.length)
    const fitted = this.fitted(declared, listed)
    return declared
      .flatMap((column, index) =>
        column.shown
          ? [column.width ? column.track : listed[index] || fitted[index] || column.track]
          : [],
      )
      .join(' ')
  }

  /**
   * Tracks for the columns that set nothing, from how much text each holds.
   *
   * **A column of sentences wraps and a column of values does not.** Every
   * column left at `minmax(max-content, 1fr)` asks for its longest cell on one
   * line, which is right for `eu-central-1` and wrong for a description: the
   * table grows as wide as its longest sentence and scrolls, on a phone and on
   * a desktop alike. So once any column holds more than `SHORT` characters,
   * the short columns keep `max-content`, and each long one wraps above a
   * `FLOOR`, taking a share of the room in proportion to its text.
   *
   * A table with no long column keeps the default, so a table of values lays
   * out as it always has. A column's `width` and a track in `columns` are both
   * statements an author made, and each wins over this.
   *
   * Characters stand in for width. They only have to rank columns against each
   * other, and a count needs no layout, so it reads the same before paint as
   * after. Sampled, so a table of thousands of rows reads `SAMPLE` of them.
   */
  private fitted(declared: HelixHeadlessTableColumn[], listed: string[]): string[] {
    const open = declared.map((column, index) => column.shown && !column.width && !listed[index])
    if (!open.includes(true)) {
      return []
    }
    const widths = declared.map((column) => lengthOf(column))
    for (const row of this.slotted.slice(0, SAMPLE)) {
      for (const [at, width] of widths.entries()) {
        widths[at] = Math.max(width, lengthOf(row.children[at]))
      }
    }
    const long = widths.filter((width, at) => open[at] && width > SHORT)
    if (long.length === 0) {
      return []
    }
    /* Measured against the narrowest long column, so the numbers stay small
       and readable in the inspector: a column with twice the text of its
       neighbor asks for twice the room. */
    const narrowest = Math.min(...long)
    return widths.map((width, at) => {
      if (!open[at]) {
        return ''
      }
      return width > SHORT
        ? `minmax(${FLOOR}, ${Number((width / narrowest).toFixed(2))}fr)`
        : 'max-content'
    })
  }

  /* Columns arrive from the light DOM, which changes no property here, so
     nothing would schedule the render that reads them. */
  /** Asks for the render a hydration put off, which reads the rows. */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  private readonly handleSlotChange = (): void => {
    this.requestUpdate()
  }

  /**
   * Watches the light DOM for rows and columns arriving, leaving and moving.
   *
   * **A manually assigned slot does not announce them**, the same gap `Chat`
   * and `Carousel` watch for. Under `slotAssignment: 'manual'` only `assign`
   * changes an assignment, so a row appended after the first render reached no
   * slot and drew nowhere, and a column moved to another place lost its
   * assignment on the way out and never got it back: measured in Chromium, both
   * `assignedSlot` null a render later. A table whose definition loaded before
   * its markup was parsed drew no columns at all, having rendered before any
   * arrived.
   *
   * **The cells' text too, all the way down.** The columns that set no width
   * are sized from what their cells say, so a cell whose text changes can
   * change the track it sits in.
   */
  private watcher: MutationObserver | undefined = undefined

  override connectedCallback(): void {
    super.connectedCallback()
    this.watcher = new MutationObserver(() => this.requestUpdate())
    this.watcher.observe(this, { characterData: true, childList: true, subtree: true })
    this.addEventListener('click', this.handleHeadClick)
    this.addEventListener('helix-before-toggle', this.handleToggle)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.watcher?.disconnect()
    this.watcher = undefined
    this.removeEventListener('click', this.handleHeadClick)
    this.removeEventListener('helix-before-toggle', this.handleToggle)
  }

  /**
   * Nothing is assigned by name, so the columns can be put in a row.
   *
   * The table pattern is `table > row > columnheader`, and a header cell
   * landing directly under `role="table"` with no owning row is invalid: it is
   * a cell belonging to nothing. The columns are ordinary children the consumer
   * writes with no `slot`, so the only way to put a wrapper around them without
   * changing what a consumer writes is to assign them here.
   *
   * Manual rather than a `slot` attribute this element would set on the
   * consumer's own markup, which is the change a React consumer's hydration
   * reports and does not patch up. Assignment writes nothing at all.
   *
   * Safe against the server because this repo ships no declarative shadow DOM:
   * the shadow root exists only after upgrade, and the assignment below runs in
   * that same update. There is no window in which the shadow is present and the
   * assignment has not happened.
   */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixElement.shadowRootOptions,
    slotAssignment: 'manual',
  }

  /** The rows: every child that is not a column, which is what the body slot is assigned. */
  protected override get slotted(): Element[] {
    const columns = new Set<Element>(this.tableColumns)
    return [...(this.children ?? [])].filter(
      (child) => !columns.has(child) && child.getAttribute('slot') !== 'heading',
    )
  }

  private assign(): void {
    /* Hydrating a server's root, which routes by name: the columns say where
       they go and the rows need nothing, the unnamed slot being theirs. */
    if (this.assignsByName) {
      for (const column of this.tableColumns) {
        this.route(column, 'columns')
      }
      return
    }
    const head = this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="columns"]')
    const body = this.renderRoot?.querySelector<HTMLSlotElement>('slot:not([name])')
    if (!head || !body) {
      return
    }
    head.assign(...this.tableColumns)
    body.assign(...this.arrangedRows)
    this.renderRoot
      ?.querySelector<HTMLSlotElement>('slot[name="heading"]')
      ?.assign(...this.headings)
  }

  /**
   * The rules handing each column's `text-align` to the cells under it. One sheet for
   * every row this table holds, rewritten in place, so a column changing its
   * edge reaches every row in one write.
   */
  private alignment: CSSStyleSheet | undefined = undefined

  /** What `alignment` was last written with, so a render that changed no edge writes nothing. */
  private aligned = ''

  /**
   * Tells every row which edge each of its cells lines up against.
   *
   * **A rule in each row's shadow root, keyed on position and written by this
   * table.** The cells are the consumer's markup, so nothing may be written onto
   * them, and each of the other ways fails somewhere a table goes:
   *
   * - This element's own sheet cannot reach them. `::slotted()` matches what is
   *   assigned here, which is the rows, and never a row's children.
   * - A property per column published here, `--table-align-2: end`, still needs
   *   a rule that knows which column a cell is in, and a fixed ladder of
   *   `:nth-child` rules in a static sheet is a ceiling on the column count.
   * - A custom state set on each cell by script is right only until a cell
   *   moves, and a cell moving inside a row changes no child list this element
   *   watches.
   *
   * `:nth-child` is matched by the browser against wherever a cell is now, so a
   * cell that moves takes its new column's edge with no script at all; a column
   * that moves rewrites the rules on the render the watcher asks for; and a
   * column hidden along with its cells keeps its place in both counts, since
   * `:nth-child` counts a hidden sibling the way `tableColumns` counts a hidden
   * column. The row is where they go because only the shadow root holding a
   * slot can style what is assigned to it.
   *
   * **A custom property and nothing else**, which is how this tier publishes a
   * fact: the edge is the author's declaration, and what lining up means, a
   * `justify-content` or a `text-align`, belongs to whoever draws the cell.
   * `initial` on every cell first, so a table nested in an aligned cell does not
   * take the outer column's edge for columns of its own that set none.
   */
  private alignCells(): void {
    if (typeof CSSStyleSheet === 'undefined' || !('replaceSync' in CSSStyleSheet.prototype)) {
      return
    }
    /* The attribute is a string anybody can write and this is a stylesheet, so
       only the three edges reach it. `edgeOf` is that guard, shared with
       `DataTable`, which puts the same attribute into the cells it
       draws. */
    const rules = this.tableColumns.flatMap((column, index) => {
      const edge = edgeOf(column.textAlign)
      return edge ? [`::slotted(:nth-child(${index + 1})) { --table-cell-align: ${edge}; }`] : []
    })
    const text = ['::slotted(*) { --table-cell-align: initial; }', ...rules].join('\n')
    this.alignment ??= new CSSStyleSheet()
    if (text !== this.aligned) {
      this.alignment.replaceSync(text)
      this.aligned = text
    }
    for (const row of this.slotted) {
      if ('isTableRow' in row) {
        ;(row as HelixHeadlessTableRow).alignCells(this.alignment)
      }
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.announced = this.news()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.assign()
    this.alignCells()
    this.markSorted()
    this.markSelected()
    this.nameByHeading()
  }

  /** The heading of the checkbox column, which selects every row. */
  private renderSelectAll(): TemplateResult | typeof nothing {
    if (!this.selectable) {
      return nothing
    }
    /* None while the rows are not known, as on a server, so a render hydrating
       what one sent draws the box the server drew. Read from the rows there,
       the box's mixed state was primed as committed and never drawn. */
    const every = this.childrenKnown ? this.keyed.map(({ key }) => key) : []
    const keys = this.chosen
    const count = every.filter((key) => keys.has(key)).length
    const checkbox = this.tag('checkbox')
    return html`<span part="select-all" role="columnheader"
      ><${checkbox}
        part="checkbox"
        exportparts="box: checkbox-box, control: checkbox-control, feedback: checkbox-feedback,
          field: checkbox-field, hint: checkbox-hint, label: checkbox-label, mark: checkbox-mark,
          mark-checked: checkbox-mark-checked, mark-dash: checkbox-mark-dash,
          mark-indeterminate: checkbox-mark-indeterminate"
        aria-label=${this.selectAllLabel}
        .checked=${every.length > 0 && count === every.length}
        .indeterminate=${count > 0 && count < every.length}
      ></${checkbox}
    ></span>`
  }

  protected override render(): TemplateResult {
    const template = this.template
    return html`<slot name="heading"></slot><div
      part="table"
      role="table"
      aria-busy=${this.loading ? 'true' : nothing}
      aria-label=${this.label || 'Table'}
      style=${template ? `--table-template: ${template}` : ''}
    >
      <div part="head" role="row">${this.renderSelectAll()}<slot name="columns"></slot></div>
      <slot
        @slotchange=${(event: Event) => {
          this.countRows(event)
          this.handleSlotChange()
        }}
      ></slot>
      ${this.renderStatus(this.hasRows, 'cell')}
    </div>${this.renderLive(this.hasRows)}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-table': HelixHeadlessTable
  }
}
