import {
  AriaForwardController,
  anchorAt,
  assignSlots,
  commaList,
  customElement,
  cycle,
  type DataRow,
  everyState,
  followLink,
  format,
  formatWords,
  HelixBeforeToggleEvent,
  HelixElement,
  HelixSelectEvent,
  HelixSelectedEvent,
  HelixSortEvent,
  HelixSortedEvent,
  HelixToggleEvent,
  inRowOrder,
  MixinCollection,
  onAndroid,
  parse,
  ReorderController,
  rangeAdd,
  reflectElements,
  requestChange,
  sort,
  splitValues,
  toggleEvery,
  whenHydrated,
  words,
} from '@fusion.dev/helix-core'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
/* `static-html`'s `html`, because the checkbox's tag is interpolated. */
import { html } from 'lit/static-html.js'
import '../../checkbox/index.js'
import { edgeOf, type HelixHeadlessTableColumn } from '../column/table-column.js'
import { type GridCell, type LeadColumn, TableGridController } from '../grid-controller.js'
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

/** The slots a child names for itself, which hold content other than rows. */
const STATUS = new Set(['empty', 'error', 'loading'])
const NAMED = new Set([...STATUS, 'heading'])

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
 * **Sorting.** A column with `sortable` and a `field` draws its heading as a
 * button that sorts the rows by the text of its cells, numbers by their value.
 * Your markup is not reordered: the table draws the rows in the sorted order.
 *
 * 1. Each press cycles the column through ascending, descending, and the
 *    order the rows were written in, which keeps a server's own ranking
 *    reachable.
 * 2. `helix-sort` asks first, with `field:direction`, or empty for the written
 *    order. Refuse it to keep the order, or to sort the rows yourself and set
 *    `sort`.
 * 3. `helix-sorted` follows once the order stands, and `sort` holds it.
 * 4. The heading carries `aria-sort`, and a screen reader hears `sorted-label`
 *    ("Sorted by Name, ascending") or `unsorted-label` from a polite region.
 *
 * Tab reaches each sort button, and Enter or Space presses it.
 *
 * The `heading` slot names the table: slot a heading or a line of text into
 * it, and the table is named by its words. An `aria-label` or `aria-labelledby` on the
 * host wins over it.
 *
 * **Selecting.** `selectable` adds a column of checkboxes.
 *
 * 1. Each row is known by its `value`, or by its place among the rows where it
 *    has none, and `selected` holds the chosen keys, comma separated, the same
 *    shape `DataTable` uses. `default-selected` is where it starts.
 * 2. A row's checkbox is named by `select-row-label` ("Select {row}") with the
 *    words of the row's first cell. The checkbox in the heading selects every
 *    row, and shows a dash while only some are chosen.
 * 3. `helix-select` asks first, with every key the change would leave.
 *    Refuse it to keep the selection. `helix-selected` follows once it stands.
 * 4. A chosen row takes `:state(selected)`, and a screen reader hears
 *    `selected-label` ("2 selected") from a polite region.
 *
 * Tab reaches each checkbox, and Space ticks it. To act on one row, put a
 * link or a button in a cell, or give the row an `href`.
 *
 * `selection-mode="single"` selects one row at a time: ticking a row lets go
 * of the one before, the heading holds no checkbox, and Shift and Control with
 * A take in nothing more. `selection-behavior="replace"` makes a press on a
 * row, anywhere but its own controls, select it alone, as a file list does,
 * and in a `grid` table the arrow keys carry the selection with them. Control
 * or Command with a press adds or takes out the row, and with an arrow moves
 * without selecting. Shift with a press takes in the rows from the one last
 * chosen.
 *
 * **Nesting rows.** A row with `parent` sits under the row of that key, as
 * a file sits in a folder. The table then draws a column of disclosure
 * buttons, under a heading named by `expand-column-label`: a row with rows
 * under it has a button named by `expand-row-label` ("Expand {row}") that
 * says with `aria-expanded` whether it is open, and the rows under a shut row
 * are not drawn. `expanded` holds the open rows' keys, comma separated, and
 * `default-expanded` is where it starts. A press asks with
 * `helix-before-toggle` and tells with `helix-toggle`, both from the row, so
 * you can refuse it or load the rows on the way. A sort orders the rows
 * under each row among themselves, and in a `grid` table the table is a
 * `treegrid` whose rows say their depth.
 *
 * **Moving rows.** `reorderable` adds a column of grips before the checkboxes,
 * under a heading named by `row-grips-label`.
 *
 * 1. Each row is known by its `value`, or by its place among the rows where it
 *    has none, as for selecting. Give rows a `value` when they move, so a key
 *    stays with its row.
 * 2. A grip is a button named by `move-row-label` ("Move {row}") with the
 *    words of the row's first cell. Drag it to move its row, and the page
 *    scrolls near an edge. Or press it with Space, Enter, or a click to pick
 *    the row up, move it with Up, Down, Home, and End, and press it again to
 *    drop it. A click on another row drops it there, and Escape puts it back.
 * 3. `helix-before-reorder` asks first, and `helix-reorder` follows with
 *    `keys`, every row's key in the new order. **You move the rows**: the
 *    table moves no element of yours, and focus goes back to the moved row's
 *    grip once you have.
 * 4. Each step is said in the table's live region, in words you can change:
 *    `picked-up-label`, `moved-label`, `dropped-label`, and `canceled-label`.
 *    The grips do nothing while a sort is set.
 *
 * **A grid.** `grid` makes the table one tab stop that the arrow keys move
 * through cell by cell, the headings included, as React Aria's table is. The
 * table is then a `grid` and each value a `gridcell`, and the table gives
 * every cell a `tabindex` so focus can rest on it: set `grid` only where the
 * cells may carry one.
 *
 * | Key | What it does |
 * |---|---|
 * | Right, Left | Moves one cell along the row. Left moves on, on a right-to-left page. |
 * | Down, Up | Moves one row, the headings included. |
 * | Home, End | Moves to the first or the last cell of the row. |
 * | Control with Home or End | Moves to the first or the last cell of the table. |
 * | Page Down, Page Up | Moves by the rows that fit in view. |
 * | Enter, F2 | Moves into the cell's links and controls. Escape or F2 moves back to the cell, and Tab moves between the controls of one cell. |
 * | Enter on a cell of a row with `href` | Follows the row's link. |
 * | Enter, Space on a sortable heading | Sorts by the column. |
 * | Space on a row, Enter or Space on its checkbox cell | Selects the row, in a `selectable` table. |
 * | Enter or Space on a disclosure cell | Shows or hides the rows under the row, in a table whose rows nest. |
 * | Enter or Space on a grip cell | Picks the row up, or drops it, in a `reorderable` table. Up, Down, Home, and End move a row picked up, and Escape puts it back. |
 * | Down, Up, Page Down, Page Up under `selection-behavior="replace"` | Selects the row it moves to alone. Control or Command with the key moves without selecting. |
 * | Shift with Down or Up | Selects the rows it moves across, in a `selectable` table. |
 * | Shift with Space | Selects every row from the one last chosen, in a `selectable` table. |
 * | Control or Command with A | Selects every row, in a `selectable` table. |
 * | A letter or a word | Moves to the next row whose first cell starts with what you typed. |
 * | Tab | Leaves the table. |
 *
 * When the rows did not load, set `error-text`, such as "The orders did not
 * load", and put a button that tries again in the `error` slot. The line shows
 * after the rows in place of the empty and loading lines, the live region says
 * it, and the table takes the `error` state. Clear it once you try again.
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
 * @slot empty - Content shown when there are no rows and none are loading, such as a picture and a link. Falls back to `empty-text`, which the live region still says.
 * @slot error - Content shown while `error-text` is set, such as a button that tries again. Falls back to `error-text`, which the live region still says.
 * @slot heading - Words that name the table, shown above it, such as a heading.
 * @slot loading - Content shown while the rows load, such as a spinner. Falls back to `loading-text`, which the live region still says.
 *
 * @event {HelixBeforeReorderEvent} helix-before-reorder - Fired when a row is dropped at a new place, in a `reorderable` table, with every row's key in the new order. Cancelable: cancel it to keep the row where it is.
 * @event {HelixBeforeToggleEvent} helix-before-toggle - Fired from a row when its disclosure button is pressed, with whether it would be open in `detail.checked`. Cancelable: cancel it to keep the row as it is.
 * @event {HelixReorderEvent} helix-reorder - Fired after `helix-before-reorder` when nobody canceled it. Move your rows to the order in `keys`. Cancelable: cancel it to say the move did not happen.
 * @event {HelixSelectEvent} helix-select - The selection is about to change. The event carries every selected key, separated by commas. Cancelable: cancel it to keep the current selection.
 * @event {HelixSelectedEvent} helix-selected - Fired after the selection changes, with every selected key, separated by commas.
 * @event {HelixSortEvent} helix-sort - A different sort order was requested, as `field:direction`, or empty for the order the rows were written in. Cancelable: cancel it to keep the current order.
 * @event {HelixSortedEvent} helix-sorted - Fired after the sort order changes, with the new order.
 * @event {HelixToggleEvent} helix-toggle - Fired from a row once the rows under it are shown or hidden, with whether it is open in `detail.checked`.
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
 * @csspart drag-preview - A copy of the row a pointer drags by its grip, which follows the pointer in the top layer until the row is let go, in a `reorderable` table. Hidden from assistive technology.
 * @csspart empty - The text shown when there are no rows.
 * @csspart error - The line shown after the rows while `error-text` is set, in place of the empty and loading text.
 * @csspart expand-head - The heading over the disclosure buttons, in a table whose rows nest.
 * @csspart grid-end - An empty box after the rows, in a `grid` table. Tab focuses it on its way out of the table, so the key leaves from the end.
 * @csspart grid-start - An empty box before the rows, in a `grid` table. Shift with Tab focuses it on its way out of the table.
 * @csspart grip-head - The heading over the row grips, in a `reorderable` table.
 * @csspart head - The row that holds the column headings. It has `display: contents`, so it takes no space of its own.
 * @csspart live - A live region that repeats the empty and loading text, and says each step of a move, so screen readers announce it when it changes. Visually hidden in the styled tier.
 * @csspart loading - The text shown while the rows are loading.
 * @csspart select-all - The heading that holds the checkbox that selects every row.
 * @csspart table - The grid.
 *
 * @cssproperty --table-template - The column track list the table works out from its columns. The component writes it inline on the element that reads it, so setting it has no effect. Set `columns` to change the tracks.
 *
 * @cssstate empty - While there are no rows and none are loading.
 * @cssstate error - While `error-text` is set.
 */
@customElement('helix-headless-table')
export class HelixHeadlessTable extends MixinCollection(HelixElement) {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-table': { selectAllLabel: 'Alle Zeilen auswählen' } })`.
   */
  static words = 'helix-table'

  /** The empty and loading lines are the `empty` and `loading` slots. */
  protected override statusSlots = true

  /**
   * The word for an ascending sort, in a `sorted-label` that writes `{order}`.
   *
   * @deprecated Write the whole sentence for each order in `sorted-label`, with
   * `{direction, select, ascending {...} descending {...} other {...}}`.
   * Removed in the next major version.
   */
  @words
  @property({ attribute: 'ascending-label' })
  ascendingLabel = 'ascending'

  /**
   * What screen readers hear when a held row is put back, or a move is
   * refused, in a `reorderable` table.
   */
  @words
  @property({ attribute: 'canceled-label' })
  canceledLabel = 'Canceled'

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
   * The keys of the rows whose rows are shown at the start, separated by
   * commas. Used until `expanded` is set.
   */
  @property({ attribute: 'default-expanded' })
  defaultExpanded = ''

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
   * The word for a descending sort, in a `sorted-label` that writes `{order}`.
   *
   * @deprecated Write the whole sentence for each order in `sorted-label`, with
   * `{direction, select, ascending {...} descending {...} other {...}}`.
   * Removed in the next major version.
   */
  @words
  @property({ attribute: 'descending-label' })
  descendingLabel = 'descending'

  /** What screen readers hear when a held row is dropped, in a `reorderable` table. */
  @words
  @property({ attribute: 'dropped-label' })
  droppedLabel = 'Dropped'

  /**
   * The text shown and announced when the rows could not load. Set it when a
   * fetch fails, and clear it once you try again. Empty, the default, shows
   * nothing.
   *
   * While it is set, a line after the rows shows it, or your own content in the
   * `error` slot, in place of the empty and loading lines, and the live region
   * says it.
   */
  @property({ attribute: 'error-text' })
  errorText = ''

  /** The name of the heading over the disclosure buttons. */
  @words
  @property({ attribute: 'expand-column-label' })
  expandColumnLabel = 'Expand'

  /**
   * The keys of the rows whose rows are shown, separated by commas, in a table
   * whose rows nest. A press on a row's disclosure button asks first, and
   * `default-expanded` seeds what this element then owns.
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

  /** The name of a row's disclosure button. `{row}` is the words of the row's first cell. */
  @words
  @property({ attribute: 'expand-row-label' })
  expandRowLabel = 'Expand {row}'

  /**
   * The table's name where neither `label` nor an `aria-label` or
   * `aria-labelledby` on the host gives it one.
   */
  @words
  @property({ attribute: 'fallback-label' })
  fallbackLabel = 'Table'

  /**
   * Makes the table a grid: one tab stop, and the arrow keys, Home, End and the
   * Page keys move focus between its cells, the headings included. Enter moves
   * into a cell's controls, and Tab leaves the table.
   *
   * Off by default, where the table is a static `table` and Tab reaches each
   * link and control in it. On, the table writes a `tabindex` onto each of its
   * cells, which is the one way a cell of your markup can take focus.
   */
  @property({ type: Boolean })
  grid = false

  /**
   * Accessible name for the table.
   *
   * An `aria-label` or `aria-labelledby` on the host names the table too, and
   * wins over this.
   */
  @property()
  label = ''

  /**
   * What screen readers hear each time a key moves a held row, in a
   * `reorderable` table. `{name}` is the row's words, `{position}` the place it
   * would go, counting from 1, and `{count}` the number of rows.
   */
  @words
  @property({ attribute: 'moved-label' })
  movedLabel = '{name} moved to position {position} of {count}'

  /**
   * The name of a row's grip, in a `reorderable` table. `{row}` is replaced
   * with the words of the row's first cell.
   */
  @words
  @property({ attribute: 'move-row-label' })
  moveRowLabel = 'Move {row}'

  /**
   * What screen readers hear when a key or a click picks up a row, in a
   * `reorderable` table. `{name}` is the row's words.
   */
  @words
  @property({ attribute: 'picked-up-label' })
  pickedUpLabel = 'Picked up {name}'

  /**
   * Adds a column of grips that move rows, by dragging or with the keys. The
   * table moves no row itself: you move your rows on `helix-reorder`.
   */
  @property({ type: Boolean })
  reorderable = false

  /** The name of the heading over the row grips, in a `reorderable` table. */
  @words
  @property({ attribute: 'row-grips-label' })
  rowGripsLabel = 'Move rows'

  /**
   * Adds a column of checkboxes for selecting rows. Each row is known by its
   * `value`, and by its place among the rows as written where it has none.
   */
  @property({ type: Boolean })
  selectable = false

  /** The name of the checkbox in the heading that selects every row. */
  @words
  @property({ attribute: 'select-all-label' })
  selectAllLabel = 'Select every row'

  /**
   * The name of the heading over the checkboxes under
   * `selection-mode="single"`, where it holds no checkbox of its own.
   */
  @words
  @property({ attribute: 'select-column-label' })
  selectColumnLabel = 'Select'

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
   * rows are chosen, written in the locale, and a language that needs plural
   * forms writes them: `{count, plural, one {# wybrany} few {# wybrane} many
   * {# wybranych} other {# wybranego}}`.
   */
  @words
  @property({ attribute: 'selected-label' })
  selectedLabel = '{count} selected'

  /**
   * What a press on a row, or in a `grid` table a key that moves to one, does
   * to the rows already selected: `toggle`, the default, leaves them to the
   * checkboxes, and `replace` selects the row alone.
   */
  @property({ attribute: 'selection-behavior' })
  selectionBehavior: 'replace' | 'toggle' = 'toggle'

  /**
   * How many rows a `selectable` table selects: `multiple`, the default, or
   * `single`, one at a time.
   */
  @property({ attribute: 'selection-mode' })
  selectionMode?: 'multiple' | 'single'

  /**
   * The name of a row's checkbox. `{row}` is replaced with the words of the
   * row's first cell.
   */
  @words
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
   * column's heading and `{direction}` is `ascending` or `descending`, so each
   * order has its whole sentence. `{order}` is the deprecated
   * `ascending-label` or `descending-label`.
   */
  @words
  @property({ attribute: 'sorted-label' })
  sortedLabel =
    '{direction, select, ascending {Sorted by {column}, ascending} descending {Sorted by {column}, descending} other {Sorted by {column}}}'

  /** What screen readers hear when the table stops being sorted. */
  @words
  @property({ attribute: 'unsorted-label' })
  unsortedLabel = 'Not sorted'

  @state()
  private sortState: string | undefined = undefined

  @state()
  private selectedState: string | undefined = undefined

  @state()
  private expandedState: string | undefined = undefined

  /** Whether any row sits under another, which makes the table a tree. */
  private get nests(): boolean {
    return this.childrenKnown && this.keyed.some(({ row }) => (row.parent ?? '') !== '')
  }

  /** The keys of the rows whose rows are shown. */
  private get open(): Set<string> {
    return new Set(commaList(this.expanded))
  }

  /**
   * Shows or hides the rows under the row of `key`, asking first from the row,
   * and saying so from it once it stands.
   */
  private toggleRow(key: string): void {
    const row = this.rowFor(key)
    if (!row) {
      return
    }
    const next = !this.open.has(key)
    const applied = requestChange({
      apply: (checked) => {
        const keys = this.open
        if (checked) {
          keys.add(key)
        } else {
          keys.delete(key)
        }
        const previous = this.expanded
        this.expandedState = inRowOrder(keys, this.everyKey).join(',')
        this.requestUpdate('expanded', previous)
      },
      event: (checked) => new HelixBeforeToggleEvent({ checked }),
      host: row,
      next,
    })
    if (applied) {
      row.dispatchEvent(new HelixToggleEvent({ checked: next }))
    }
  }

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

  /** The keyboard of a `grid` table, in `grid-controller.ts`. */
  private readonly gridKeys = new TableGridController(this, {
    activate: (place, event) => this.activate(place, event),
    arrive: (to, control) => {
      if (this.replaces && !control) {
        this.chooseOnly(to)
      }
    },
    columns: () => this.tableColumns.filter((column) => column.shown),
    lead: () => this.lead,
    on: () => this.grid,
    part: (name) => this.partNamed(name),
    rows: () => (this.childrenKnown ? this.arrangedRows : []),
    rowWords: () => this.arrangedRows.map((row) => textOf(row.children[0])),
    selectAll: () =>
      this.selectable &&
      !this.single &&
      this.requestSelected(new Set([...this.chosen, ...this.enabledKeys])),
    selectRange: (to, from) => this.selectRange(to, from),
  })

  /**
   * Moving rows by their grips, in a `reorderable` table. The rows are the
   * page's, so a drop asks the page to move them, and the grips do nothing
   * while a sort decides the order.
   */
  private readonly reorder = new ReorderController(this, {
    axis: 'block',
    /* A row has no box of its own, so its grip's stands for it. */
    box: (key) => this.gripOf(this.rowFor(key))?.getBoundingClientRect(),
    enabled: () => this.reorderable && !parse(this.sort),
    grip: (event) => {
      const path = event.composedPath()
      const found = this.keyed.find(({ row }) => path.includes(this.gripOf(row) as Element))
      const element = this.gripOf(found?.row)
      return found && element ? { element, key: found.key } : undefined
    },
    item: (event) => {
      const path = event.composedPath()
      return this.keyed.find(({ row }) => path.includes(row))?.key
    },
    keys: () => this.everyKey,
    kind: 'row',
    name: (key) => textOf(this.rowFor(key)?.children[0]) || key,
    preview: (key) => this.rowFor(key),
    refocus: (key) => this.gripOf(this.rowFor(key))?.focus(),
  })

  /** The columns drawn before the consumer's cells: the grips, then the checkboxes. */
  private get lead(): LeadColumn[] {
    return [
      ...(this.reorderable ? (['grip'] as const) : []),
      ...(this.selectable ? (['select'] as const) : []),
      ...(this.nests ? (['expand'] as const) : []),
    ]
  }

  /** The row that stands for a key. */
  private rowFor(key: string): Row | undefined {
    return this.keyed.find((one) => one.key === key)?.row
  }

  /**
   * What takes focus for a row's grip, in a `reorderable` table: the cell in a
   * grid, where every cell takes focus, and the button otherwise.
   */
  private gripOf(row: Row | undefined): HTMLElement | null | undefined {
    const cell = row?.shadowRoot?.querySelector<HTMLElement>('[part~="grip"]')
    return this.grid ? cell : cell?.querySelector('button')
  }

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
    let ordered = rows
    if (spec && index >= 0) {
      const records = rows.map((element) => ({ element, value: textOf(element.children[index]) }))
      /* A column of numbers compares as numbers, so `980` comes before `1,204`
         and a negative sorts below zero. A column with any word in it collates
         as text, digits by their value. */
      const numeric = records.every(({ value }) => value === '' || Number.isFinite(numberOf(value)))
      const order = numeric
        ? (row: DataRow): unknown => (row.value === '' ? '' : numberOf(row.value as string))
        : (row: DataRow): unknown => row.value
      const sorted = sort(records, spec, [
        { field: spec.field, order },
      ]) as unknown as typeof records
      ordered = sorted.map((record) => record.element)
    }
    return this.nests ? this.nested(ordered) : ordered
  }

  /**
   * The rows of a tree in the order they are drawn: each row followed by the
   * rows under it while it is open, at every depth, keeping the order `rows`
   * is in among the rows under one row. A row under a key no row has is drawn
   * at the top.
   */
  private nested(rows: Element[]): Element[] {
    const keys = new Map(this.keyed.map(({ key, row }) => [row as Element, key]))
    const present = new Set(keys.values())
    const under = new Map<string, Element[]>()
    for (const row of rows) {
      const parent = (row as Row).parent ?? ''
      const at = parent !== '' && present.has(parent) ? parent : ''
      under.set(at, [...(under.get(at) ?? []), row])
    }
    const open = this.open
    const drawn: Element[] = []
    const seen = new Set<Element>()
    const walk = (parent: string): void => {
      for (const row of under.get(parent) ?? []) {
        /* A row set under one of its own rows would walk for ever. */
        if (seen.has(row)) {
          continue
        }
        seen.add(row)
        drawn.push(row)
        const key = keys.get(row) ?? ''
        if (open.has(key)) {
          walk(key)
        }
      }
    }
    walk('')
    return drawn
  }

  /** How deep each row sits, from 1, and whether rows sit under it, by key. */
  private shape(): Map<string, { branch: boolean; level: number }> {
    const parents = new Map(this.keyed.map(({ key, row }) => [key, row.parent ?? '']))
    const shapes = new Map<string, { branch: boolean; level: number }>()
    for (const key of parents.keys()) {
      let level = 1
      let at = parents.get(key) ?? ''
      const passed = new Set([key])
      while (at !== '' && parents.has(at) && !passed.has(at)) {
        passed.add(at)
        level += 1
        at = parents.get(at) ?? ''
      }
      shapes.set(key, { branch: false, level })
    }
    for (const parent of parents.values()) {
      const shape = shapes.get(parent)
      if (shape) {
        shape.branch = true
      }
    }
    return shapes
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
        ? this.sortSaid(
            column?.textContent?.trim() || parsed.field,
            parsed.direction === 'asc' ? 'ascending' : 'descending',
          )
        : this.unsortedLabel
    }
    this.heardSort = current
    const selected = this.selectable ? this.selected : ''
    if (this.hasUpdated && current === this.heardSortBefore && selected !== this.heardSelected) {
      said = formatWords(this, 'selectedLabel', { count: this.chosen.size })
    }
    this.heardSortBefore = current
    this.heardSelected = selected
    return said
  }

  /**
   * The sentence a sort is said in: `sorted-label` with the column, and the
   * order both as `{direction}` and as the deprecated `{order}` word.
   */
  private sortSaid(column: string, direction: 'ascending' | 'descending'): string {
    return formatWords(this, 'sortedLabel', {
      column,
      direction,
      order: direction === 'ascending' ? this.ascendingLabel : this.descendingLabel,
    })
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
      /* In row order, as Data Table writes it, whatever order the rows were
         pressed in. */
      next: inRowOrder(
        keys,
        this.keyed.map(({ key }) => key),
      ).join(','),
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
    if (root === this.renderRoot) {
      event.preventDefault()
      this.chooseAll()
      return
    }
    const found = this.keyed.find(({ row }) => row.shadowRoot === root)
    if (!found) {
      return
    }
    event.preventDefault()
    this.chooseRow(found.key, event.detail.checked)
  }

  /** Every row's key, in the order the rows are written. */
  private get everyKey(): string[] {
    return this.keyed.map(({ key }) => key)
  }

  /** The keys of the rows that can be chosen: every row that is not `disabled`. */
  private get enabledKeys(): string[] {
    return this.keyed.filter(({ row }) => !row.disabled).map(({ key }) => key)
  }

  /** Whether the row of that key is `disabled`. */
  private isDisabled(key: string): boolean {
    return this.keyed.find((one) => one.key === key)?.row.disabled === true
  }

  /**
   * The checkbox in the heading: every row that can be chosen, or none of
   * them where each already is. A `disabled` row keeps what it had.
   */
  private chooseAll(): void {
    if (this.single) {
      return
    }
    this.requestSelected(new Set(toggleEvery(this.chosen, this.enabledKeys)))
  }

  /** Whether the table selects one row at a time. */
  private get single(): boolean {
    return this.selectionMode === 'single'
  }

  /** Whether a press or a move on a row selects it alone. */
  private get replaces(): boolean {
    return this.selectable && this.selectionBehavior === 'replace'
  }

  /**
   * Selects the drawn row `at` alone, and makes it where a range runs from.
   * Asks nothing where it is already the only one selected.
   */
  private chooseOnly(at: number): void {
    const row = this.arrangedRows[at]
    const found = this.keyed.find((one) => one.row === row)
    if (!found || found.row.disabled) {
      return
    }
    this.anchorKey = found.key
    const now = this.chosen
    if (now.size === 1 && now.has(found.key)) {
      return
    }
    this.requestSelected(new Set([found.key]))
  }

  /**
   * A press on a row under `selection-behavior="replace"`: it selects the row
   * alone, Control or Command adds or takes out the row, and Shift takes in
   * the rows from the one last chosen. A press on the row's own controls, its
   * checkbox or its grip is theirs.
   */
  private readonly handleRowClick = (event: MouseEvent): void => {
    if (!this.replaces || event.defaultPrevented) {
      return
    }
    const path = event.composedPath()
    const at = this.arrangedRows.findIndex((row) => path.includes(row))
    const row = this.arrangedRows[at] as Row | undefined
    if (!row) {
      return
    }
    const control = path.find(
      (node) =>
        node instanceof Element &&
        (node.matches('a[href], button, input, select, textarea, label, [contenteditable]') ||
          /* The row's own cells, the checkbox, the grip and the disclosure.
             Not its slot, which a press on any of the page's cells passes. */
          (node.getRootNode() === row.shadowRoot && node.localName !== 'slot')),
    )
    if (control) {
      return
    }
    if (event.shiftKey && !this.single) {
      this.selectRange(at, at)
      return
    }
    const found = this.keyed.find((one) => one.row === row)
    if (found && (event.ctrlKey || event.metaKey)) {
      this.chooseRow(found.key, !this.chosen.has(found.key))
      return
    }
    this.chooseOnly(at)
  }

  /** The key of the row a Shift range runs from: the one last chosen. */
  private anchorKey: string | undefined = undefined

  /**
   * Selects every row from the one last chosen to the drawn row `to`, keeping
   * what was already selected. With no row to run from, the range is the row
   * the reader is on, `from`, and it becomes the one to run from. Says whether
   * the table selects at all.
   */
  private selectRange(to: number, from: number): boolean {
    if (!this.selectable) {
      return false
    }
    /* One row at a time takes in nothing more: the row it reached is the one. */
    if (this.single) {
      this.chooseOnly(to)
      return true
    }
    const keyOf = new Map(this.keyed.map(({ key, row }) => [row as Element, key]))
    const keys = this.arrangedRows.map((row) => keyOf.get(row) ?? '')
    const { anchor, anchorKey } = anchorAt(keys, this.anchorKey, from)
    this.anchorKey = anchorKey
    const now = this.chosen
    const next = rangeAdd([...now], keys, anchor, to)?.filter(
      (key) => now.has(key) || !this.isDisabled(key),
    )
    if (next && next.length > now.size) {
      this.requestSelected(new Set(next))
    }
    return true
  }

  /** One row's checkbox, ticked or not. It becomes the row a range runs from. */
  private chooseRow(key: string, on: boolean): void {
    if (this.isDisabled(key)) {
      return
    }
    this.anchorKey = key
    const keys = this.single ? new Set(this.chosen.has(key) ? [key] : []) : this.chosen
    if (on) {
      if (this.single) {
        keys.clear()
      }
      keys.add(key)
    } else {
      keys.delete(key)
    }
    this.requestSelected(keys)
  }

  /**
   * Enter, Space or F2 on a cell of a `grid` table, and whether it did
   * anything. Left alone, Enter and F2 move into the cell's controls.
   */
  private activate(place: GridCell, event: KeyboardEvent): boolean {
    const leads = this.lead
    const lead = leads[place.column] === 'select'
    if (event.key === 'F2') {
      return false
    }
    if (place.row >= 0 && leads[place.column] === 'expand') {
      const row = this.arrangedRows[place.row] as Row | undefined
      const found = this.keyed.find((one) => one.row === row)
      if (found && row?.branch) {
        this.toggleRow(found.key)
        return true
      }
      return false
    }
    if (place.row === -1) {
      if (lead) {
        this.chooseAll()
        return true
      }
      const shown = this.tableColumns.filter((one) => one.shown)
      const column = shown[place.column - leads.length]
      if (column?.canSort) {
        this.toggleSort(column.field)
        return true
      }
      return false
    }
    const row = this.arrangedRows[place.row] as Row | undefined
    const found = this.keyed.find((one) => one.row === row)
    if (this.selectable && found && (event.key === ' ' || lead)) {
      /* Under `replace` Space selects the row alone, and Control or Command
         with it adds or takes out the row, as a press does. */
      if (this.replaces && !lead && !(event.ctrlKey || event.metaKey)) {
        this.chooseOnly(place.row)
      } else {
        this.chooseRow(found.key, !this.chosen.has(found.key))
      }
      return true
    }
    if (event.key === 'Enter' && row?.href && !row.disabled) {
      followLink(this.ownerDocument, { href: row.href, rel: row.rel, target: row.target }, event)
      return true
    }
    return false
  }

  /**
   * Tells each row whether it is selected and what its checkbox is called.
   *
   * Pushed down for the reason the sort is: the selection is the table's, and
   * the checkbox is drawn by the row.
   */
  private markSelected(): void {
    const keys = this.chosen
    const still = Boolean(parse(this.sort))
    const tree = this.nests
    const shapes = tree ? this.shape() : undefined
    const open = this.open
    for (const { key, row } of this.keyed) {
      if (!row.isTableRow) {
        continue
      }
      const name = textOf(row.children[0]) || key
      const label = formatWords(this, 'selectRowLabel', { row: name })
      const grip = this.reorderable ? formatWords(this, 'moveRowLabel', { row: name }) : ''
      const move = this.reorder.moveOf(key)
      /* Not into a row still hydrating what a server sent: see `whenHydrated`.
         A server cannot tell a row it is in a selectable table, so it serves no
         checkbox cell, and one written into the hydrating render is a template
         where the server's markup has none, which Lit refuses. */
      const shape = shapes?.get(key)
      const expand = tree ? formatWords(this, 'expandRowLabel', { row: name }) : ''
      whenHydrated(row, () => {
        row.selectable = this.selectable
        row.selected = keys.has(key)
        row.selectLabel = label
        row.gripLabel = grip
        row.gripStill = still
        row.move = move
        row.level = shape?.level ?? 0
        row.branch = shape?.branch ?? false
        row.open = open.has(key)
        row.expandLabel = expand
        row.expandWith = tree ? () => this.toggleRow(key) : undefined
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
    const android = onAndroid()
    for (const column of this.tableColumns) {
      column.sorted =
        current && column.canSort && column.field === current.field
          ? current.direction === 'asc'
            ? 'ascending'
            : 'descending'
          : undefined
      /* TalkBack reads no `aria-sort`, so on Android the sorted column's button
         says it, as React Aria's column header does. */
      column.sortWords =
        android && column.sorted
          ? this.sortSaid(column.textContent?.trim() || column.field, column.sorted)
          : ''
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
    /* The grips and the checkboxes take what they need and no more, ahead of
       everything. */
    const lead = this.lead.map(() => 'max-content ').join('')
    return tracks ? lead + tracks : tracks
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
    this.addEventListener('click', this.handleRowClick)
    this.addEventListener('helix-before-toggle', this.handleToggle)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.watcher?.disconnect()
    this.watcher = undefined
    this.removeEventListener('click', this.handleHeadClick)
    this.removeEventListener('click', this.handleRowClick)
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

  /**
   * The rows: every child that is not a column, a heading, or the content of
   * the `empty` or `loading` slot, which is what the body slot is assigned.
   */
  protected override get slotted(): Element[] {
    const columns = new Set<Element>(this.tableColumns)
    return [...(this.children ?? [])].filter(
      (child) => !columns.has(child) && !NAMED.has(child.getAttribute('slot') ?? ''),
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
    /* The rows in the order they are drawn, which is the order the default
       slot is given them in. */
    const columns = new Set<Element>(this.tableColumns)
    const headings = new Set<Element>(this.headings)
    const status = [...(this.children ?? [])].filter((child) =>
      STATUS.has(child.getAttribute('slot') ?? ''),
    )
    assignSlots(
      this.renderRoot as ParentNode | undefined,
      [...columns, ...headings, ...status, ...this.arrangedRows],
      (child) =>
        columns.has(child)
          ? 'columns'
          : headings.has(child)
            ? 'heading'
            : status.includes(child)
              ? (child.getAttribute('slot') ?? '')
              : '',
    )
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
    this.toggleState('error', this.errorText !== '')
    this.toggleState('empty', !this.loading && !this.hasRows)
    this.assign()
    this.alignCells()
    this.markSorted()
    this.markSelected()
    this.nameByHeading()
    if (this.childrenKnown) {
      this.gridKeys.mark()
      this.gridKeys.place()
    }
  }

  /** The heading over the row grips, named by `row-grips-label`. */
  private renderGripHead(): TemplateResult | typeof nothing {
    if (!this.reorderable) {
      return nothing
    }
    return html`<span
      part="grip-head"
      role="columnheader"
      aria-label=${this.rowGripsLabel}
      tabindex=${this.grid ? (this.gridKeys.isStop({ column: 0, row: -1 }) ? '0' : '-1') : nothing}
    ></span>`
  }

  /** The heading over the disclosure buttons, in a table whose rows nest. */
  private renderExpandHead(): TemplateResult | typeof nothing {
    if (!this.nests) {
      return nothing
    }
    return html`<span
      part="expand-head"
      role="columnheader"
      aria-label=${this.expandColumnLabel}
      tabindex=${this.grid ? (this.gridKeys.isStop({ column: this.lead.indexOf('expand'), row: -1 }) ? '0' : '-1') : nothing}
    ></span>`
  }

  /** The heading of the checkbox column, which selects every row. */
  private renderSelectAll(): TemplateResult | typeof nothing {
    if (!this.selectable) {
      return nothing
    }
    /* One row at a time has nothing to select every row of, so the heading
       holds no checkbox and is named for the column. */
    if (this.single) {
      return html`<span part="select-all" role="columnheader" aria-label=${this.selectColumnLabel}
        tabindex=${this.grid ? (this.gridKeys.isStop({ column: this.lead.indexOf('select'), row: -1 }) ? '0' : '-1') : nothing}
      ></span>`
    }
    /* None while the rows are not known, as on a server, so a render hydrating
       what one sent draws the box the server drew. Read from the rows there,
       the box's mixed state was primed as committed and never drawn. */
    const every = this.childrenKnown ? this.enabledKeys : []
    const { checked, indeterminate } = everyState(this.chosen, every)
    const checkbox = this.tag('checkbox')
    const grid = this.grid
    const column = this.lead.indexOf('select')
    return html`<span part="select-all" role="columnheader"
      tabindex=${grid ? (this.gridKeys.isStop({ column, row: -1 }) ? '0' : '-1') : nothing}
      ><${checkbox}
        part="checkbox"
        tabindex=${grid ? '-1' : nothing}
        exportparts="box: checkbox-box, control: checkbox-control, feedback: checkbox-feedback,
          field: checkbox-field, hint: checkbox-hint, label: checkbox-label, mark: checkbox-mark,
          mark-checked: checkbox-mark-checked, mark-dash: checkbox-mark-dash,
          mark-indeterminate: checkbox-mark-indeterminate"
        aria-label=${this.selectAllLabel}
        .checked=${checked}
        .indeterminate=${indeterminate}
      ></${checkbox}
    ></span>`
  }

  protected override render(): TemplateResult {
    const template = this.template
    const grid = this.grid
    /* The two ends a Tab leaves the grid by, each focused for a moment so the
       key goes on from there. Empty, so they take no room. */
    const start = grid ? html`<span part="grid-start" tabindex="-1"></span>` : nothing
    const end = grid ? html`<span part="grid-end" tabindex="-1"></span>` : nothing
    return html`<slot name="heading"></slot>${start}<div
      part="table"
      role=${grid ? (this.nests ? 'treegrid' : 'grid') : 'table'}
      aria-multiselectable=${grid && this.selectable ? (this.single ? 'false' : 'true') : nothing}
      aria-busy=${this.loading ? 'true' : nothing}
      aria-label=${this.label || this.fallbackLabel}
      style=${template ? `--table-template: ${template}` : ''}
    >
      <div part="head" role="row">${this.renderGripHead()}${this.renderSelectAll()}${this.renderExpandHead()}<slot name="columns"></slot></div>
      <slot
        @slotchange=${(event: Event) => {
          this.countRows(event)
          this.handleSlotChange()
        }}
      ></slot>
      ${
        this.errorText === ''
          ? this.renderStatus(this.hasRows, grid ? 'gridcell' : 'cell')
          : html`<p part="error" role="row"><span role=${grid ? 'gridcell' : 'cell'}><slot name="error">${this.errorText}</slot></span></p>`
      }
    </div>${end}${
      this.errorText === ''
        ? this.renderLive(this.hasRows)
        : html`<span part="live" role="status">${this.errorText}</span>`
    }${this.reorder.drawDragPreview()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-table': HelixHeadlessTable
  }
}
