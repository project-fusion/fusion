import {
  AriaForwardController,
  byRow,
  CHART_PLOT,
  commaList,
  customElement,
  drawTooltip,
  formatWords,
  HelixElement,
  HelixReadingChangeEvent,
  HelixReadingPressEvent,
  HelixResizeEvent,
  MixinChartSource,
  MixinChartStatus,
  markRegion,
  numberConverter,
  pressedValue,
  rangeAdd,
  requestValue,
  StatusController,
  spokenReading,
  words,
  writtenList,
  writtenNumbers,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import '../../tooltip/index.js'
import { inSequence, rectangleOf } from '../rectangle.js'
import { fits, monthPage, overviewOf, type Reading, toneOf } from './buckets.js'

/**
 * @summary A strip of cells, each colored by its reading, for uptime, contributions, or activity.
 *
 * @description
 * A grid of cells, each colored by a tone. `rows="1"` makes a status strip, and
 * `rows="7"` makes a contribution graph. GitHub's contribution graph uses five
 * discrete levels, which a set of tones covers.
 *
 * Color in a heatmap is per cell. In every other Helix chart, color is per
 * series, so ninety differently colored cells would need ninety series.
 *
 * **The data is a real `<table>` named by `for`**, as in every Helix chart, and
 * the table is the accessible representation. Hide it with
 * `data-hidden-visually`, and screen readers still read it.
 *
 * A cell takes its tone from its own `data-tone`, or from `thresholds` and
 * `tones` applied to its value. `data-tone` wins, so when you already know a
 * day was degraded, you can set the tone directly.
 *
 * **The headless tier does not resolve tone names.** A tone named `success`
 * writes `--heatmap-tone: var(--heatmap-tone-success)`, and the styled tier or
 * your own stylesheet defines that property. The headless tier does not use
 * `var(--helix-color-*)`.
 *
 * **The strip is read by key.** It takes focus once it has cells. The up and
 * down arrows move a cell, the left and right arrows move a column, which is a
 * week with `rows="7"`, and Home and End go to the first and the last. The
 * tooltip follows, the `live` part says the cell's row in words, and Escape
 * puts the tooltip away. PageUp and PageDown move a month, to the same day,
 * where each row's header carries its date as a `<time datetime>`, and four
 * columns otherwise, which is four weeks with `rows="7"`.
 *
 * **The strip describes itself.** The `overview` part says the busiest
 * reading and the total of the readings drawn, "Busiest: 11 Jun, 12; Total
 * 84", and the strip is described by it, as every chart is by its summary.
 * Hide it visually. The `summary` slot is still yours, for words of your own.
 *
 * **`selection-mode` lets a reader select cells**: `single` one at a time and
 * `multiple` any number. Space, Enter or a press selects the cell the keys or
 * the pointer rest on, or lets it go, and under `multiple` Shift with an arrow,
 * Home, End, PageUp or PageDown takes in every cell from the last one pressed
 * to where the key went. `value` holds the selected days, separated by
 * commas: each by its row's `<time datetime>`, such as `2026-06-11`, or by
 * its row's name where the row carries no date. A change asks with
 * `helix-before-change` and tells with `change`, and the `selection` part says
 * how many are selected, in `selection-label`.
 *
 * **`selection-shape="rectangle"` selects a rectangle of cells** under
 * `multiple`, as a spreadsheet selects a range: the cells between two corners
 * by row and by column, such as the same weekdays across three weeks with
 * `rows="7"`. Shift with a key that moves grows or shrinks it from the cell
 * last pressed, Shift with a click takes it to the cell clicked, and a click
 * with Ctrl or Command selects one cell or lets it go and starts the next
 * rectangle there. The rectangle is the same cells on a right-to-left page,
 * where the columns run from the right, a short last column adds only the
 * cells it has, and `value` lists the selected days in the table's order.
 *
 * **Under `selection-mode` the strip is a grid**, so the selection is state a
 * reader is told rather than words alone: each column of the strip is a `row`,
 * a week with `rows="7"`, and each cell a `gridcell` named by its row in the
 * table and carrying `aria-selected`. The strip says
 * `aria-multiselectable` under `multiple` and points at the cell the keys rest
 * on with `aria-activedescendant`, so a screen reader reads that cell, and the
 * `live` part stays quiet. Without `selection-mode` nothing is selectable, and
 * the strip is an application with the readout, as every chart's plot is.
 *
 * **Readings are sent as every chart sends them.** `helix-reading-change`
 * says each move of the reading, by pointer, tap or key, and
 * `helix-reading-press` a reading clicked, tapped, or pressed with Enter or
 * Space, each with the row of the table in `index`.
 *
 * **Nothing to draw.** A table with no readings shows `empty-text`, "No
 * readings", under the strip, and `loading` shows `loading-text` there until
 * readings arrive. The `empty` and `loading` slots take markup in place of
 * either, as on every chart.
 *
 * **Keyboard.** The strip is one tab stop once it has cells.
 *
 * | Key | What it does |
 * |---|---|
 * | Tab | Moves focus to the strip and shows the first cell. |
 * | Down, Up | Moves to the next or the previous cell. |
 * | Right, Left | Moves a column on or back, a week with `rows="7"`. On a right-to-left page, Left moves on. |
 * | Home, End | Moves to the first or the last cell. |
 * | Page Down, Page Up | Moves a month on or back where the rows carry dates, and four columns otherwise. |
 * | Enter, Space | Presses the cell, which sends `helix-reading-press`, and selects it or lets it go under `selection-mode`. |
 * | Shift with an arrow, Home, End, Page Up or Page Down | Selects every cell from the last one pressed to where the key went, under `selection-mode="multiple"`. |
 * | Shift with an arrow, Home, End, Page Up or Page Down, with `selection-shape="rectangle"` | Grows or shrinks the rectangle from the last cell pressed to where the key went, in rows and columns, under `selection-mode="multiple"`. |
 * | Escape | Puts the cell's tooltip away. |
 *
 * @since 0.1.0
 * @status stable
 * @category charts
 * @aliases Contribution graph, Uptime strip, Calendar heatmap, Activity graph
 * @documentation https://fusion.dev/helix/components/heatmap
 *
 * @slot empty - Content shown under the strip when the table has no readings, such as a link to add the first. Falls back to `empty-text`.
 * @slot end - Below the strip, at the trailing edge: usually the newest date.
 * @slot loading - Content shown under the strip while `loading` is set and there are no readings yet. Falls back to `loading-text`.
 * @slot start - Below the strip, at the leading edge: usually the oldest date.
 * @slot summary - Below the strip, in the middle: a summary of the range shown.
 *
 * @event {Event} change - Fired once a press or a key has changed which cells are selected.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before a press or a key changes which cells are selected, with the `value` it would leave. Cancelable.
 * @event {HelixReadingChangeEvent} helix-reading-change - The reading shown moved, or was put away: `index` is the row, or `-1` for none, with its `label`, the `series` the keys rest on, and the `pointerType` that moved it.
 * @event {HelixReadingPressEvent} helix-reading-press - A reading was clicked, tapped, or pressed with Enter or Space, with the same detail as `helix-reading-change`.
 * @event {HelixResizeEvent} helix-resize - Fired when the number of cells drawn changes, with the new number.
 *
 * @csspart cell - One reading.
 * @csspart cell-active - The cell the pointer or the keys rest on. Set alongside `cell`.
 * @csspart cell-selected - A cell that is selected, under `selection-mode`. Set alongside `cell`.
 * @csspart empty - The words under the strip when the table has no readings: the `empty` slot, falling back to `empty-text`. Not drawn while the table cannot be read yet, on the server and during hydration, there being no document to resolve `for` in.
 * @csspart end - The trailing slot's box.
 * @csspart footer - The three-slot row under the strip.
 * @csspart live - The readout: a polite live region that says the cell the keys moved to. Hide it visually.
 * @csspart loading - The words under the strip while `loading` is set and there are no readings: the `loading` slot, falling back to `loading-text`.
 * @csspart mark - The invisible point the tooltip is anchored to.
 * @csspart overview - The busiest reading and the total of the readings drawn, written as a sentence for screen readers, which describes the strip. Rendered once there are cells. Hide it visually.
 * @csspart plot - The same element as `strip`, under the name every chart gives the drawing that takes focus.
 * @csspart row - A column of cells, which a grid reads as a row, under `selection-mode`. It draws no box.
 * @csspart selection - A polite region that says how many cells are selected after a change, rendered from the first change. Hide it visually.
 * @csspart sonify - The button that plays the chart as sound, under `sonify`.
 * @csspart start - The leading slot's box.
 * @csspart strip - The grid of cells, which takes focus to be read by key. It is named by the host's `aria-labelledby` or `aria-label`, then by `label`, then by the caption of the table.
 * @csspart summary - The middle slot's box.
 * @csspart table - The readings as a table, for a screen reader, rendered only where they were drawn from `data`, a page of them at a time past a few hundred. Hide it visually.
 * @csspart table-pages - Which readings a page of the `table` holds, and the buttons that show the previous and the next page, rendered only while it holds a page. Hide it visually.
 * @csspart tooltip-anchor - The `Tooltip` element itself.
 * @csspart tooltip-arrow - The bubble's point, forwarded from `Tooltip`.
 * @csspart tooltip-arrow-bottom - The point while the bubble is below the reading, on its top edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-arrow-left - The point while the bubble is left of the reading, on its right edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-arrow-right - The point while the bubble is right of the reading, on its left edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-arrow-top - The point while the bubble is above the reading, on its bottom edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-cell - One column's name and value inside the tooltip.
 * @csspart tooltip-cell-current - The cell the series keys rest on, in the charts whose readings hold several series. A strip draws one, so it is never set here.
 * @csspart tooltip-label - The reading's own name inside the tooltip.
 * @csspart tooltip-name - A column's name inside the tooltip.
 * @csspart tooltip-surface - The bubble, forwarded from `Tooltip`.
 * @csspart tooltip-surface-bottom - The bubble while it is below the reading. Set alongside `tooltip-surface`.
 * @csspart tooltip-surface-left - The bubble while it is left of the reading. Set alongside `tooltip-surface`.
 * @csspart tooltip-surface-right - The bubble while it is right of the reading. Set alongside `tooltip-surface`.
 * @csspart tooltip-surface-top - The bubble while it is above the reading. Set alongside `tooltip-surface`.
 * @csspart tooltip-value - A column's value inside the tooltip.
 *
 * @cssproperty --heatmap-rows - How many rows the strip lays out. The component writes it from the data, and the stylesheet that draws the strip reads it.
 * @cssproperty --heatmap-tone - The tone of the cell it is set on. The component writes it, and the stylesheet that paints the cell reads it.
 * @cssproperty --heatmap-tone-1 - The weakest step of the magnitude ramp, used by `tones="1 …"`.
 * @cssproperty --heatmap-tone-2 - The second step of the magnitude ramp.
 * @cssproperty --heatmap-tone-3 - The third step of the magnitude ramp.
 * @cssproperty --heatmap-tone-4 - The fourth step of the magnitude ramp.
 * @cssproperty --heatmap-tone-5 - The strongest step of the magnitude ramp.
 * @cssproperty --heatmap-tone-accent - The color of the `accent` tone.
 * @cssproperty --heatmap-tone-danger - The color of the `danger` tone.
 * @cssproperty --heatmap-tone-info - The color of the `info` tone.
 * @cssproperty --heatmap-tone-muted - The color of the `muted` tone: a quiet background, for a bucket that means nothing happened.
 * @cssproperty --heatmap-tone-primary - The color of the `primary` tone.
 * @cssproperty --heatmap-tone-success - The color of the `success` tone, named in `tones` or in `data-tone`.
 * @cssproperty --heatmap-tone-warning - The color of the `warning` tone.
 *
 * @cssstate active - While a cell is shown, under the pointer or the keys, with its tooltip open.
 * @cssstate empty - While the `empty` part stands in place of the cells.
 * @cssstate loading - While the `loading` part stands in place of the cells.
 */
@customElement('helix-headless-heatmap')
export class HelixHeadlessHeatmap extends MixinChartStatus(MixinChartSource(HelixElement)) {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-heatmap': { emptyText: 'Keine Werte' } })`.
   */
  static words = 'helix-heatmap'

  /**
   * The name the `overview` gives the busiest reading, `{busiestLabel}` in
   * `overview-label`.
   */
  @words
  @property({ attribute: 'busiest-label' })
  busiestLabel = 'Busiest'

  /**
   * Space between cells, in CSS pixels. It is a number for the same reason
   * `min-cell` is.
   */
  @property({ converter: numberConverter('gap', 2, 'pixels') })
  gap = 2

  /**
   * The smallest a cell may get before the strip draws fewer of them, in CSS pixels.
   *
   * **Set this only to overrule what the strip actually draws.** The arithmetic
   * needs a width in pixels and the width is a length the stylesheet resolves,
   * so a number written here that disagrees with the sheet is a promise the
   * consumer has to keep by hand, and the one number a summary is told to trust
   * is the one it gets wrong.
   *
   * The strip measures itself, so sizing the cells in a sheet is enough on its
   * own and these two are the estimate used until the first measurement lands.
   * Writing the attribute pins the value and stops the measurement being
   * consulted, which is what a container query or a transition on the cell size
   * wants, where what is drawn this frame is not what the arithmetic should
   * plan around.
   *
   * Zero turns the dropping off altogether, which is right for a strip in a
   * container that cannot get narrow.
   */
  @property({ attribute: 'min-cell', converter: numberConverter('min-cell', 8, 'pixels') })
  minCell = 8

  /**
   * The `overview`'s sentence. `{busiestLabel}` and `{totalLabel}` are
   * `busiest-label` and `total-label`, `{busiest}` the busiest reading's name
   * and its reading as the table writes it, and `{total}` the total of the
   * readings drawn, written in the locale.
   */
  @words
  @property({ attribute: 'overview-label' })
  overviewLabel = '{busiestLabel}: {busiest}; {totalLabel} {total}.'

  /**
   * How many rows the strip has.
   *
   * `1` is a status strip and `7` is a calendar week, which are the two readings
   * this covers. Cells fill down the column and then across, which is what a
   * calendar heatmap does: a week is a column, so the strip reads along the
   * line in weeks, from the right on a right-to-left page, and top to bottom in
   * days.
   */
  @property({ converter: numberConverter('rows', 1) })
  rows = 1

  /**
   * What the readout added for a selected cell, under `selection-mode`.
   *
   * @deprecated The strip is a grid under `selection-mode`, and each cell says
   * whether it is selected with `aria-selected`, in the reader's own words, so
   * the readout says nothing there and this is not read.
   */
  @words
  @property({ attribute: 'selected-label' })
  selectedLabel = 'selected'

  /**
   * What the `selection` part says after the selection changes. `{count}` is
   * how many cells are selected, written in the locale, and a language that
   * needs plural forms writes them: `{count, plural, one {# wybrany} few
   * {# wybrane} many {# wybranych} other {# wybranego}}`.
   */
  @words
  @property({ attribute: 'selection-label' })
  selectionLabel = '{count, plural, one {# selected} other {# selected}}'

  /**
   * How many cells a reader can select: `single` or `multiple`.
   *
   * Absent selects nothing, and a press or Space does what it did.
   */
  @property({ attribute: 'selection-mode' })
  selectionMode?: 'multiple' | 'single'

  /**
   * What Shift takes in under `selection-mode="multiple"`: `linear`, every
   * cell between two in the table's order, or `rectangle`, the cells between
   * two corners by row and by column, as a spreadsheet selects a range.
   */
  @property({ attribute: 'selection-shape' })
  selectionShape: 'linear' | 'rectangle' = 'linear'

  /**
   * The strip's name where the chart has none: no `aria-label`, `label`, or
   * table caption.
   */
  @words
  @property({ attribute: 'strip-label' })
  stripLabel = 'Heatmap'

  /**
   * Lower bounds for the tone buckets, in the order the tones are given.
   *
   * `thresholds="1 3 6 9"` with `tones="1 2 3 4"` puts 1 and 2 in the ramp's
   * first step, 3 to 5 in the second, 6 to 8 in the third, and 9 upward in the
   * fourth. A value below the first bound gets no tone at all: an empty day in a
   * contribution graph is a day with nothing in it, and painting it as the
   * lowest bucket claims a reading that does not exist.
   */
  @property()
  thresholds = ''

  /**
   * The tone for each bucket, in the same order as `thresholds`.
   *
   * A name, resolved as `--heatmap-tone-<name>` by whichever tier answers.
   * **`"1"` through `"5"` are a ramp and everything else is a category**, which
   * is the distinction a heatmap lives or dies on: magnitude has to be one hue
   * getting louder, because a reader compares two cells by weight and cannot
   * compare two hues at all. `tones="surface info accent success primary"` for a
   * commit count is five unrelated hues for five amounts, which is confetti with
   * no order in it.
   */
  @property()
  tones = ''

  /**
   * The name the `overview` gives the total of the readings drawn,
   * `{totalLabel}` in `overview-label`.
   */
  @words
  @property({ attribute: 'total-label' })
  totalLabel = 'Total'

  /**
   * The selected cells, separated by commas: each by the date its row's
   * header carries in a `<time datetime>`, such as `2026-06-11`, or by the
   * header's words where it carries none.
   *
   * Set it to start with cells selected. Written by a press or a key under
   * `selection-mode`.
   */
  @property()
  value = ''

  /**
   * How many cells are actually drawn.
   *
   * **This is the number a summary has to agree with**, and the reason it is
   * published at all: a consumer's own summary is their markup and this element
   * cannot rewrite it, so the only honest arrangement is to hand over the count
   * and say when it changed.
   *
   * **A plain getter, and the attribute is written in `updated`, because
   * `@property({ reflect: true })` on a getter with no setter reflects once and
   * then goes stale.** Lit reflects a property that is in `changedProperties`,
   * and nothing puts a derived getter there after the first update: the
   * attribute would be right on load and wrong from the first resize, which is
   * the exact failure the count exists to prevent, arriving through the
   * mechanism meant to prevent it.
   */
  get visible(): number {
    return Math.min(this.points.length, this.room)
  }

  /**
   * The width last measured, or nothing before the first measurement.
   *
   * Undefined rather than zero, because the two mean different things and the
   * difference is a whole strip: unmeasured has to show everything, since a
   * first paint that shows one cell and then expands is a flicker on every load.
   */
  @state()
  protected width: number | undefined = undefined

  /**
   * The cell and gap the strip is drawing, in pixels, once it has been read.
   *
   * **The arithmetic's inputs are a stylesheet's decisions, so the honest way
   * to learn them is to ask the stylesheet.** A cell's size is a length that
   * only the cascade can resolve: it may be a `rem` against a root font size, a
   * percentage of a container, or whatever a container query chose this frame.
   * Every one of those is invisible to a number typed into an attribute, and
   * every hook a sheet offers for the cell box or the gap is one more way for
   * the two to drift apart silently.
   *
   * Reading it back is not styling and does not breach the tier: this asks what
   * was decided rather than deciding, which is the same direction as the facts
   * this component writes out as custom properties, run backwards.
   */
  @state()
  private metrics: { cell: number; gap: number } | undefined = undefined

  /**
   * Carries a host `aria-labelledby` and `aria-describedby` to the strip, the
   * image a reader lands on. The host is a generic around it.
   */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('strip'),
  })

  private observer: ResizeObserver | undefined = undefined

  private announced: number | undefined = undefined

  /**
   * Where a range taken in with Shift starts: the row of the table whose cell
   * was last pressed, or none.
   *
   * **The row, and not the cell's place among those drawn.** A narrow strip
   * draws the newest whole columns, so a resize that drops or adds a column
   * moves every cell's place, and an anchor kept as a place started the next
   * range on another day.
   */
  private anchor = -1

  /** The cell the keys rested on before the key now being handled moved them. */
  private left = -1

  /**
   * What a rectangle is added to: the selection when it was started, less its
   * anchor, kept while `value` is still the rectangle last written.
   */
  private base: string[] | undefined = undefined

  /** The `value` the last rectangle wrote. */
  private shaped: string | undefined = undefined

  /** The region a change of selection is said in, rendered from the first change. */
  protected readonly status = new StatusController(this)

  /**
   * The name each drawn cell stands for in `value`: the date its row's header
   * carries in a `<time datetime>`, or the header's words where it carries
   * none.
   */
  protected keysOf(cells: readonly Reading[]): string[] {
    const offset = this.points.length - cells.length
    const rows = this.sourceRows
    return cells.map((_, index) => {
      const row = rows[offset + index]
      return row?.when ?? row?.label ?? ''
    })
  }

  /**
   * Moves `value` to `next`, asking first: `helix-before-change` carries it,
   * a listener that refuses keeps the selection, and `change` follows, with
   * the count said in the `selection` part.
   */
  private choose(next: string): void {
    if (next === this.value) {
      return
    }
    requestValue(this, next, (value) => {
      this.value = value
      this.status.say(formatWords(this, 'selectionLabel', { count: commaList(value).length }))
    })
  }

  /** Selects the drawn cell at `index`, or lets it go, as `selection-mode` says. */
  private press(index: number): void {
    const mode = this.selectionMode
    const key = this.keysOf(this.drawn)[index]
    if (!mode || key === undefined || key === '') {
      return
    }
    this.anchor = this.dropped + index
    this.base = undefined
    this.choose(pressedValue(mode, this.value, key))
  }

  /**
   * Selects the rectangle from the anchor to the drawn cell at `to`, beside
   * what was selected before it started, under `selection-shape="rectangle"`.
   * Without an anchor it starts where the keys were.
   */
  private stretch(to: number): void {
    const all = this.keysOf(this.points)
    const dropped = this.dropped
    if (all[this.anchor] === undefined) {
      this.anchor = dropped + (this.left < 0 ? to : this.left)
    }
    if (this.base === undefined || this.value !== this.shaped) {
      const corner = all[this.anchor]
      this.base = commaList(this.value).filter((one) => one !== corner)
    }
    /* Over every row, shifted so the columns fall where the strip draws them:
       the strip drops whole columns, so the shift is the same at every width.
       An anchor in a column no longer drawn still takes in its corner. */
    const rows = this.rowCount
    const shift = (rows - (dropped % rows)) % rows
    const taken = rectangleOf(all.length + shift, rows, this.anchor + shift, dropped + to + shift)
      .filter((at) => at >= shift)
      .map((at) => all[at - shift] ?? '')
    this.choose(inSequence([...this.base, ...taken].filter(Boolean), all).join(', '))
    this.shaped = this.value
  }

  /** Notes where the keys rest before the pointer controller moves them. */
  protected readonly onStripKeydown = (): void => {
    this.left = this.pointer.at
  }

  /**
   * Space and Enter select the cell the keys rest on, and Shift with a key
   * that moved them takes in the range from the anchor. After the pointer
   * controller, which has already moved `at` for an arrow.
   */
  private readonly onKeydown = (event: KeyboardEvent): void => {
    const at = this.pointer.at
    if (!this.selectionMode || at < 0 || event.altKey || event.ctrlKey || event.metaKey) {
      return
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      this.press(at)
      return
    }
    const moves = /^(Arrow|Page|Home$|End$)/.test(event.key)
    if (!event.shiftKey || !moves || this.selectionMode !== 'multiple') {
      return
    }
    if (this.selectionShape === 'rectangle') {
      this.stretch(at)
      return
    }
    const keys = this.keysOf(this.points)
    const from = keys[this.anchor] === undefined ? -1 : this.anchor
    const added = rangeAdd(commaList(this.value), keys, from, this.dropped + at)
    if (added) {
      this.choose(added.join(', '))
    }
  }

  /**
   * A press on a cell selects it, under `selection-mode`, and Shift takes the
   * rectangle to it under `selection-shape="rectangle"`.
   */
  protected readonly onClick = (event: MouseEvent): void => {
    const cell = (event.target as Element | null)?.closest?.('[part~="cell"]')
    const index = Number(cell?.getAttribute('data-index') ?? -1)
    if (!cell || !Number.isInteger(index) || index < 0) {
      return
    }
    const rectangle = this.selectionMode === 'multiple' && this.selectionShape === 'rectangle'
    if (rectangle && event.shiftKey && this.anchor >= 0) {
      this.stretch(index)
    } else {
      this.press(index)
    }
  }

  /**
   * Every row in the table, oldest first, as the table is written, with its
   * reading where the row has one.
   *
   * **Not `readings`, which the mixin already has and which means a count.**
   * Two members of the same name meaning a number and an array is the kind of
   * collision that type-checks in one direction and reads wrong in both.
   *
   * **One cell per row, and a blank row is a cell with no reading.** Taken from
   * the series alone, a blank dropped its day and every day after it moved one
   * cell along, while the tooltip still counted rows and named the day beside
   * the one under the pointer.
   */
  protected get points(): Reading[] {
    const series = this.series[0]
    if (!series) {
      return []
    }
    return byRow(series, this.sourceRows.length).map((point) => point ?? { value: undefined })
  }

  /**
   * `rows` as a usable count, which is not always what the attribute says.
   *
   * One place rather than two: the fit arithmetic and the grid template both
   * need it, and a `rows="0"` or a `rows="2.5"` that reached one of them and not
   * the other would draw a strip whose columns and whose capacity disagreed.
   */
  protected get rowCount(): number {
    return Math.max(1, Math.floor(this.rows) || 1)
  }

  /**
   * The cell width the arithmetic should plan around, in pixels.
   *
   * The attribute wins where a consumer wrote one, because that is what writing
   * it is for; otherwise what the strip draws, and the declared default only
   * until the first measurement lands.
   */
  protected get cellPx(): number {
    return this.hasAttribute('min-cell') ? this.minCell : (this.metrics?.cell ?? this.minCell)
  }

  /** The gap the arithmetic should plan around, on the same terms as `cellPx`. */
  protected get gapPx(): number {
    return this.hasAttribute('gap') ? this.gap : (this.metrics?.gap ?? this.gap)
  }

  /** How many cells the container has room for, as a whole number of columns. */
  protected get room(): number {
    return fits(
      this.points.length,
      this.width ?? Number.NaN,
      this.cellPx,
      this.gapPx,
      this.rowCount,
    )
  }

  /**
   * Reads back the cell and the gap the strip resolved.
   *
   * `gridAutoColumns` and `columnGap` rather than a cell's own box, and the
   * difference matters on the frame it matters: a cell exists only once some
   * have been drawn, and how many are drawn is what this is measuring *for*.
   * Asking the track instead breaks the circle, since a track is sized whether
   * or not anything sits in it. Neither property forces layout, so this stays a
   * style read on every update rather than a reflow.
   *
   * Anything that does not parse to a positive number leaves the estimate alone:
   * `columnGap` computes to `normal` where no gap is set, and a track given a
   * keyword or a `repeat()` has no single width to report. A wrong number here
   * is worse than no number, because it is the one the count is published from.
   */
  private measure(): void {
    const strip = this.partNamed('strip')
    if (!strip || typeof getComputedStyle !== 'function') {
      return
    }
    const style = getComputedStyle(strip)
    const cell = Number.parseFloat(style.gridAutoColumns)
    const gap = Number.parseFloat(style.columnGap)
    if (!Number.isFinite(cell) || cell <= 0 || !Number.isFinite(gap) || gap < 0) {
      return
    }
    if (this.metrics?.cell !== cell || this.metrics?.gap !== gap) {
      /* A new object rather than a mutation, because `@state` compares by
         identity and a mutated one schedules nothing. */
      this.metrics = { cell, gap }
    }
    /* **Whether there is anything between the cells, which CSS cannot ask.**
       A sheet can set the gap and cannot read it back, so a rule that wants to
       know whether a strip is a grid of tiles or one continuous field has no
       selector for it. The measurement is already here, so saying so costs
       nothing. It is a fact rather than a decision, which is the line a base
       component's custom properties are on the right side of too. */
    strip.toggleAttribute('data-spaced', gap > 0)
  }

  /**
   * The readings actually drawn, newest kept.
   *
   * The tail rather than the head: a status strip that drops the newest days to
   * keep the oldest is answering a question nobody asked.
   */
  protected get drawn(): Reading[] {
    const all = this.points
    return all.slice(Math.max(0, all.length - this.room))
  }

  /** How many of the oldest rows a narrow strip leaves undrawn. */
  private get dropped(): number {
    return Math.max(0, this.points.length - this.room)
  }

  /**
   * The number of cells drawn, which the keys walk.
   *
   * The mixin counts the table's rows, and a strip too narrow for all of them
   * draws the newest, so a key stepping by rows would walk off the drawing.
   */
  override get readings(): number {
    return this.drawn.length
  }

  /**
   * Tells the keys how many days stand in a column, so the up and down arrows
   * move a day and the across pair a week. Here rather than in `updated`, for
   * the reason `BarChart` gives: SSR calls this one.
   */
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed)
    this.pointer.grid = this.rowCount
  }

  /**
   * Where PageUp or PageDown goes from the drawn cell at `at`: the same day a
   * month on or back, by the dates the rows' headers carry. Undefined where
   * they carry none, and the keys move four columns.
   */
  pageFrom(at: number, forward: boolean): number | undefined {
    const offset = this.points.length - this.drawn.length
    return monthPage(
      this.sourceRows.slice(offset).map((row) => row.when),
      at,
      forward,
    )
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* The strip's own handlers find the cell under a pointer, which is a place
       in two dimensions, so the controller's search along one axis stays out.
       It still owns `at`, the keys and the tooltip. Here rather than in a
       constructor, where the manifest's analyzer reads the assignment as a
       member of this class. */
    this.pointer.axis = 'none'
    /* Sent with the row of the table, which is not the cell's place among
       those drawn once a narrow strip has dropped the oldest. */
    this.pointer.onReading = (heard, detail) => {
      const row = detail.index < 0 ? -1 : this.points.length - this.drawn.length + detail.index
      const told = { ...detail, index: row, label: this.sourceRows[row]?.label ?? '' }
      this.dispatchEvent(
        heard === 'press' ? new HelixReadingPressEvent(told) : new HelixReadingChangeEvent(told),
      )
    }
    this.addEventListener('keydown', this.onKeydown)
    /* Guarded because Lit SSR provides no `ResizeObserver`, and a component that
       measures itself to render has to render without the measurement first. */
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver((entries) => {
        const measured = entries[0]?.contentRect.width
        if (measured !== undefined && measured !== this.width) {
          this.width = measured
        }
      })
      this.observer.observe(this)
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('keydown', this.onKeydown)
    this.observer?.disconnect()
    this.observer = undefined
  }

  /**
   * Says on the footer whether any of its three slots holds anything.
   *
   * **A stylesheet cannot ask.** `[part="footer"]:not(:has(slot:has(*)))` is two
   * faults at once: `:has()` may not be nested inside `:has()`, so the selector
   * fails to parse and the rule is discarded whole; and a slot's assigned nodes
   * are not its DOM children, so `slot:has(*)` reports fallback content rather
   * than the fill, and is false either way. Both verified in a browser.
   */
  private markEmpty(): void {
    /* `hidden` beside the `data-empty` mirror: `data-empty` is the hook a sheet
       selects on, and this tier ships none, so an empty region left in the box
       tree would be a gap a consumer cannot close without knowing to look for
       it. Both stay, since `[hidden]` is a UA rule and a sheet setting `display`
       on these parts outranks it. */
    markRegion(this.renderRoot, 'footer', ['start', 'summary', 'end'])
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.markEmpty()
    this.measure()
    /* Written here rather than reflected, and announced only on a change: a
       consumer recomputing a summary from this is doing work, and an event per
       resize frame is work per frame.

       **Nothing measured yet is the absence of the attribute.** `updated` runs
       in the same microtask checkpoint as `firstUpdated`, before React need have
       reached the node, so writing `visible="0"` here is an attribute no server
       sent. That is the fault `data-settled` was found for. */
    const showing = this.visible
    const written = showing > 0 ? String(showing) : null
    if (this.getAttribute('visible') !== written) {
      if (written === null) {
        this.removeAttribute('visible')
      } else {
        this.setAttribute('visible', written)
      }
    }
    if (this.announced !== undefined && this.announced !== showing) {
      this.dispatchEvent(new HelixResizeEvent({ size: showing }))
    }
    this.announced = showing
  }

  protected override render(): TemplateResult {
    const bounds = writtenNumbers(this.thresholds)
    const palette = writtenList(this.tones)
    const cells = this.drawn

    /* **The strip is the picture, and the footer is beside it.** The role was
       the host's, which put the start, summary and end slots inside an image,
       whose children are presentational. Named by `named`, so a table's
       caption names it as it names every other chart. An `aria-label` on the
       host still names it, as it did while the host was the image: the host is
       now a generic, where the name reached nobody.

       **A strip with cells takes focus and is an application**, the role every
       chart's plot takes, because its cells are read by key: the arrows walk
       the days, a column at a time across, and the readout says each one. An
       empty strip has nothing to read and stays a picture. Under
       `selection-mode` it is a grid instead, whose cells say whether they are
       selected; see the class description. */
    const readable = cells.length > 0
    const grid = readable && this.selectionMode !== undefined
    const keys = this.selectionMode ? this.keysOf(cells) : []
    const chosen = new Set(this.selectionMode ? commaList(this.value) : [])
    const drawn = cells.map((reading, index) => {
      const tone = toneOf(reading, bounds, palette)
      const active = this.pointer.at === index
      const picked = chosen.has(keys[index] ?? '')
      if (grid) {
        return this.renderGridCell(index, active, picked, tone)
      }
      /* **Two templates rather than one with a conditional style, and the
         reason is that an absent tone has to mean an absent declaration.**
         `--heatmap-tone: var(--heatmap-tone-undefined)` is not an unset
         property, it is a property set to the guaranteed-invalid value, and
         `var(--heatmap-tone, …)` then declines to use its own fallback because
         the property *is* set. An untoned cell came out transparent rather
         than taking the quiet ground the sheet has for it. */
      return tone === undefined
        ? html`<span
                      part="cell${active ? ' cell-active' : ''}${picked ? ' cell-selected' : ''}"
                      data-index=${index}
                    ></span>`
        : html`<span
                part="cell${active ? ' cell-active' : ''}${picked ? ' cell-selected' : ''}"
                data-index=${index}
                data-tone=${tone}
                style="--heatmap-tone: var(--heatmap-tone-${tone})"
              ></span>`
    })
    const at = this.pointer.at
    return html`<div
        aria-activedescendant=${grid && at >= 0 ? `cell-${at}` : nothing}
        aria-describedby=${readable ? 'helix-chart-summary' : nothing}
        aria-label=${this.named || this.stripLabel}
        aria-multiselectable=${grid && this.selectionMode === 'multiple' ? 'true' : nothing}
        part="strip plot"
        id=${CHART_PLOT}
        role=${grid ? 'grid' : readable ? 'application' : 'img'}
        style="--heatmap-rows: ${this.rowCount}"
        tabindex=${readable ? '0' : nothing}
        @click=${this.onClick}
        @keydown=${this.onStripKeydown}
        @pointerover=${this.onPointerOver}
        @pointerleave=${this.onPointerLeave}
        @pointerup=${this.onPointerUp}
      >
        ${grid ? this.renderRows(drawn) : drawn}
        ${this.renderTooltip(grid)}
      </div>
      ${cells.length === 0 ? this.renderStatus() : nothing}
      <div part="footer">
        <span part="start"><slot name="start"></slot></span>
        <span part="summary"><slot name="summary"></slot></span>
        <span part="end"><slot name="end"></slot></span>
      </div>${readable ? this.renderOverview(cells) : nothing}${
        this.status.spoken
          ? html`<span part="selection" role="status">${this.status.said}</span>`
          : nothing
      }${this.renderSonify()}${this.renderTable()}`
  }

  /**
   * The cells as a grid's rows, one for each column of the strip, so a week
   * is a row with `rows="7"` and a status strip is one row.
   *
   * **A column, because that is the order the cells are in.** The strip fills
   * down the column and then across, so a row wrapping a column keeps every
   * cell where it was, and `display: contents` keeps the wrapper out of the
   * strip's grid, drawing no box, which is a mechanism and not a look. A row
   * across the strip would have taken cells out of order and moved them.
   */
  private renderRows(cells: TemplateResult[]): TemplateResult[] {
    const size = this.rowCount === 1 ? cells.length : this.rowCount
    const rows: TemplateResult[] = []
    for (let start = 0; start < cells.length; start += size) {
      rows.push(
        html`<div part="row" role="row" style="display: contents">${cells.slice(start, start + size)}</div>`,
      )
    }
    return rows
  }

  /**
   * One cell under `selection-mode`: a `gridcell` named by its row in the
   * table, its reading and its place, and saying whether it is selected, which
   * a reader hears on reaching it as the strip's active descendant.
   */
  private renderGridCell(
    index: number,
    active: boolean,
    picked: boolean,
    tone: string | undefined,
  ): TemplateResult {
    const row = this.sourceRows[this.points.length - this.drawn.length + index]
    const name = row ? spokenReading(row) : ''
    return html`<span
      aria-label=${name || nothing}
      aria-selected=${picked ? 'true' : 'false'}
      data-index=${index}
      data-tone=${tone ?? nothing}
      id="cell-${index}"
      part="cell${active ? ' cell-active' : ''}${picked ? ' cell-selected' : ''}"
      role="gridcell"
      style=${tone === undefined ? nothing : `--heatmap-tone: var(--heatmap-tone-${tone})`}
    ></span>`
  }

  /**
   * What the strip shows, in a sentence: the busiest reading drawn, as the
   * table writes it, and the total of them all, in `locale`. The strip is
   * described by it, so a reader landing on the strip hears what it holds
   * before walking it.
   */
  protected renderOverview(cells: Reading[]): TemplateResult {
    const rows = this.sourceRows
    const offset = this.points.length - cells.length
    const column = this.plottedColumns[0] ?? -1
    const { busiest, total } = overviewOf(cells)
    const row = rows[offset + busiest]
    /* The day and its count apart, so "Jan 6, 12" is not heard as one date. */
    const text = row?.cells[column]?.text ?? ''
    const said = formatWords(this, 'overviewLabel', {
      busiest: text === '' ? (row?.label ?? '') : `${row?.label ?? ''}, ${text}`,
      busiestLabel: this.busiestLabel,
      total,
      totalLabel: this.totalLabel,
    })
    return html`<p id="helix-chart-summary" part="overview">${said}</p>`
  }

  /**
   * The bubble over the cell a pointer is resting on.
   *
   * **One tooltip that moves, which is what every other chart here does.** Bar
   * Chart, Line Chart and Donut Chart each render a single anchor against an
   * invisible mark and move the mark, so the count is one however many readings
   * there are, rather than one element per cell. `drawTooltip` is their shared
   * markup and this is the fourth caller.
   *
   * What it buys over a native `title` is the row rather than the reading.
   * `sourceRows` carries every column of the table including the ones nothing
   * was plotted from, so a cell reads "11 Jun 2026 / Uptime 81.2% / Note Partial
   * outage" where `title` could only ever say the two values this component
   * happens to hold. It is also styleable, appears at once rather than after the
   * platform's second of delay, and cannot be truncated by the window edge.
   *
   * The mark is placed in pixels rather than in percent, which is the one thing
   * this does differently from its siblings: they divide a plot into equal
   * slots, and a strip's cells are a fixed size with a fixed gap inside a box
   * that is usually wider, so a percentage of the box lands between cells. The
   * pitch is `cell + gap` and both are measured.
   */
  protected renderTooltip(grid = false): TemplateResult | typeof nothing {
    const at = this.pointer.at
    /* A grid's active cell is what a reader hears, so the readout is not drawn
       there: the two would say each cell twice. */
    if (at < 0) {
      return drawTooltip(
        this.sourceRows,
        -1,
        this.tag('tooltip'),
        undefined,
        undefined,
        grid ? undefined : this.pointer,
      )
    }
    /* `sourceRows` is indexed over every reading and the strip draws a tail of
       them, so the two agree only when nothing was dropped. Off by the length of
       what was cut, a tooltip names the wrong day, and it names one that is
       still on screen, so nothing about it looks wrong. */
    const offset = this.points.length - this.drawn.length
    const cell = this.cellPx
    const gap = this.gapPx
    const column = Math.floor(at / this.rowCount)
    const row = at % this.rowCount
    return drawTooltip(
      this.sourceRows,
      offset + at,
      this.tag('tooltip'),
      {
        placement: 'top',
        x: `${column * (cell + gap) + cell / 2}px`,
        y: `${row * (cell + gap)}px`,
      },
      undefined,
      grid ? undefined : this.pointer,
    )
  }

  /**
   * Which drawn cell the pointer is over, or -1.
   *
   * `pointerover` on the strip rather than a listener per cell: the event
   * bubbles, so one handler covers however many cells there are, and unlike
   * `mouseover` it is delivered for a pen.
   */
  protected readonly onPointerOver = (event: PointerEvent): void => {
    /* A mouse or a pen, the rule every chart's pointer keeps: a touch opened
       the bubble under the finger and left it there after the finger lifted. */
    if (!this.pointer.accepts(event)) {
      return
    }
    const cell = (event.target as Element | null)?.closest?.('[part~="cell"]')
    const index = Number(cell?.getAttribute('data-index') ?? -1)
    this.pointer.set(Number.isInteger(index) ? index : -1)
  }

  /* A tap shows the cell under the finger and keeps it, as on every chart. */
  protected readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') {
      return
    }
    const cell = (event.target as Element | null)?.closest?.('[part~="cell"]')
    const index = Number(cell?.getAttribute('data-index') ?? -1)
    if (cell && Number.isInteger(index) && index >= 0) {
      this.pointer.tapTo(index)
    }
  }

  /* A cell the keys chose stays when the pointer leaves, as on every chart. */
  protected readonly onPointerLeave = (): void => {
    if (!this.pointer.keyed) {
      this.pointer.set(-1)
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-heatmap': HelixHeadlessHeatmap
  }
}
