import {
  AriaForwardController,
  byRow,
  CHART_PLOT,
  commaList,
  customElement,
  drawTooltip,
  fillTemplate,
  formatNumbers,
  HelixBeforeChangeEvent,
  HelixElement,
  HelixResizeEvent,
  MixinChartSource,
  markRegion,
  pressedValue,
  rangeAdd,
  requestChange,
  StatusController,
  searchableById,
  writtenList,
  writtenNumbers,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import '../../tooltip/index.js'
import { fits, overviewOf, type Reading, toneOf } from './buckets.js'

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
 * puts the tooltip away. PageUp and PageDown move four columns, which is four
 * weeks with `rows="7"`.
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
 * to where the key went. `value` holds the selected days, by the names their
 * rows have in the table, separated by commas. A change asks with
 * `helix-before-change` and tells with `change`, and the `selection` part says
 * how many are selected, in `selection-label`.
 *
 * @since 0.1.0
 * @status stable
 * @category charts
 * @aliases Contribution graph, Uptime strip, Calendar heatmap, Activity graph
 * @documentation https://fusion.dev/helix/components/heatmap
 *
 * @slot end - Below the strip, at the trailing edge: usually the newest date.
 * @slot start - Below the strip, at the leading edge: usually the oldest date.
 * @slot summary - Below the strip, in the middle: a summary of the range shown.
 *
 * @event {Event} change - Fired once a press or a key has changed which cells are selected.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before a press or a key changes which cells are selected, with the `value` it would leave. Cancelable.
 * @event {HelixResizeEvent} helix-resize - Fired when the number of cells drawn changes, with the new number.
 *
 * @csspart cell - One reading.
 * @csspart cell-active - The cell the pointer or the keys rest on. Set alongside `cell`.
 * @csspart cell-selected - A cell that is selected, under `selection-mode`. Set alongside `cell`.
 * @csspart empty - Shown when the table has no readings. It stays hidden until the table can be read: on the server and during hydration, there is no document to resolve `for` in.
 * @csspart end - The trailing slot's box.
 * @csspart footer - The three-slot row under the strip.
 * @csspart live - The readout: a polite live region that says the cell the keys moved to. Hide it visually.
 * @csspart mark - The invisible point the tooltip is anchored to.
 * @csspart overview - The busiest reading and the total of the readings drawn, written as a sentence for screen readers, which describes the strip. Rendered once there are cells. Hide it visually.
 * @csspart selection - A polite region that says how many cells are selected after a change, rendered from the first change. Hide it visually.
 * @csspart start - The leading slot's box.
 * @csspart strip - The grid of cells, which takes focus to be read by key. It is named by the host's `aria-labelledby` or `aria-label`, then by `label`, then by the caption of the table.
 * @csspart summary - The middle slot's box.
 * @csspart tooltip - The bubble, forwarded from `Tooltip`.
 * @csspart tooltip-anchor - The `Tooltip` element itself.
 * @csspart tooltip-arrow - The bubble's point, forwarded from `Tooltip`.
 * @csspart tooltip-arrow-bottom - The point while the bubble is below the reading, on its top edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-arrow-left - The point while the bubble is left of the reading, on its right edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-arrow-right - The point while the bubble is right of the reading, on its left edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-arrow-top - The point while the bubble is above the reading, on its bottom edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-bottom - The bubble while it is below the reading. Set alongside `tooltip`.
 * @csspart tooltip-cell - One column's name and value inside the tooltip.
 * @csspart tooltip-cell-current - The cell the series keys rest on, in the charts whose readings hold several series. A strip draws one, so it is never set here.
 * @csspart tooltip-label - The reading's own name inside the tooltip.
 * @csspart tooltip-left - The bubble while it is left of the reading. Set alongside `tooltip`.
 * @csspart tooltip-name - A column's name inside the tooltip.
 * @csspart tooltip-right - The bubble while it is right of the reading. Set alongside `tooltip`.
 * @csspart tooltip-top - The bubble while it is above the reading. Set alongside `tooltip`.
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
 */
@customElement('helix-headless-heatmap')
export class HelixHeadlessHeatmap extends MixinChartSource(HelixElement) {
  /**
   * The word the `overview` puts before the busiest reading.
   */
  @property({ attribute: 'busiest-label' })
  busiestLabel = 'Busiest'

  /**
   * Shown when the table has no readings in it.
   *
   * Never shown while the table cannot be read at all, which is a server render
   * and the hydrating one after it: see `sourceKnown`.
   */
  @property({ attribute: 'empty-text' })
  emptyText = 'No readings'

  /**
   * Space between cells, in CSS pixels. It is a number for the same reason
   * `min-cell` is.
   */
  @property({ type: Number })
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
  @property({ attribute: 'min-cell', type: Number })
  minCell = 8

  /**
   * How many rows the strip has.
   *
   * `1` is a status strip and `7` is a calendar week, which are the two readings
   * this covers. Cells fill down the column and then across, which is what a
   * calendar heatmap does: a week is a column, so the strip reads along the
   * line in weeks, from the right on a right-to-left page, and top to bottom in
   * days.
   */
  @property({ type: Number })
  rows = 1

  /**
   * What the `selection` part says after the selection changes, with `{count}` for
   * how many cells are selected.
   */
  @property({ attribute: 'selection-label' })
  selectionLabel = '{count} selected'

  /**
   * How many cells a reader can select: `single` or `multiple`.
   *
   * Absent selects nothing, and a press or Space does what it did.
   */
  @property({ attribute: 'selection-mode' })
  selectionMode?: 'multiple' | 'single'

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
   * The word the `overview` puts before the total of the readings drawn.
   */
  @property({ attribute: 'total-label' })
  totalLabel = 'Total'

  /**
   * The selected cells, by the names their rows have in the table, such as
   * `2026-06-11`, separated by commas.
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
  private width: number | undefined = undefined

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

  /** Where a range taken in with Shift starts: the cell last pressed, or none. */
  private anchor = -1

  /** The region a change of selection is said in, rendered from the first change. */
  private readonly status = new StatusController(this)

  /** The name each drawn cell stands for in `value`: its row's name in the table. */
  private keysOf(cells: readonly Reading[]): string[] {
    const offset = this.points.length - cells.length
    const rows = this.sourceRows
    return cells.map((_, index) => rows[offset + index]?.label ?? '')
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
    requestChange({
      apply: (value) => {
        this.value = value
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
        this.status.say(fillTemplate(this.selectionLabel, { count: commaList(value).length }))
      },
      event: (value) => new HelixBeforeChangeEvent({ value }),
      host: this,
      next,
    })
  }

  /** Selects the drawn cell at `index`, or lets it go, as `selection-mode` says. */
  private press(index: number): void {
    const mode = this.selectionMode
    const key = this.keysOf(this.drawn)[index]
    if (!mode || key === undefined || key === '') {
      return
    }
    this.anchor = index
    this.choose(pressedValue(mode, this.value, key))
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
    const keys = this.keysOf(this.drawn)
    const added = rangeAdd(commaList(this.value), keys, this.anchor < 0 ? at : this.anchor, at)
    if (added) {
      this.choose(added.join(', '))
    }
  }

  /** A press on a cell selects it, under `selection-mode`. */
  private readonly onClick = (event: MouseEvent): void => {
    const cell = (event.target as Element | null)?.closest?.('[part~="cell"]')
    const index = Number(cell?.getAttribute('data-index') ?? -1)
    if (cell && Number.isInteger(index) && index >= 0) {
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
  private get points(): Reading[] {
    const series = this.series[0]
    if (!series) {
      return []
    }
    return byRow(series, this.sourceRows.length).map((point) => point ?? { value: undefined })
  }

  /**
   * Whether this render can tell a table with no readings from one it has not
   * resolved yet.
   *
   * **Unknown is not empty, which is what an empty state must never say.**
   * `for` names an id and resolving an id wants a document, so a server has
   * none and a hydrating render must not look either. Without this the server
   * drew "No readings" over a table holding ninety days of them, a crawler read
   * that sentence, and the strip flipped to a full one on hydration: the fault
   * `MixinCollection` names for a slotted collection, arriving through the one
   * channel that mixin cannot see.
   *
   * The same shape as `childrenKnown`, asked of a tree that can answer about
   * ids rather than of one that holds children. An id that resolves to nothing
   * in a browser is still known, and still empty: a `for` naming no table
   * should say so rather than sit blank, which is why this asks
   * `searchableById` and not `elementById`.
   */
  private get sourceKnown(): boolean {
    if (this.for === '') {
      return true
    }
    if (this.hydrating) {
      return false
    }
    return searchableById(this)
  }

  /**
   * `rows` as a usable count, which is not always what the attribute says.
   *
   * One place rather than two: the fit arithmetic and the grid template both
   * need it, and a `rows="0"` or a `rows="2.5"` that reached one of them and not
   * the other would draw a strip whose columns and whose capacity disagreed.
   */
  private get rowCount(): number {
    return Math.max(1, Math.floor(this.rows) || 1)
  }

  /**
   * The cell width the arithmetic should plan around, in pixels.
   *
   * The attribute wins where a consumer wrote one, because that is what writing
   * it is for; otherwise what the strip draws, and the declared default only
   * until the first measurement lands.
   */
  private get cellPx(): number {
    return this.hasAttribute('min-cell') ? this.minCell : (this.metrics?.cell ?? this.minCell)
  }

  /** The gap the arithmetic should plan around, on the same terms as `cellPx`. */
  private get gapPx(): number {
    return this.hasAttribute('gap') ? this.gap : (this.metrics?.gap ?? this.gap)
  }

  /** How many cells the container has room for, as a whole number of columns. */
  private get room(): number {
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
  private get drawn(): Reading[] {
    const all = this.points
    return all.slice(Math.max(0, all.length - this.room))
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

  override connectedCallback(): void {
    super.connectedCallback()
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
       empty strip has nothing to read and stays a picture. */
    const readable = cells.length > 0
    const keys = this.selectionMode ? this.keysOf(cells) : []
    const chosen = new Set(this.selectionMode ? commaList(this.value) : [])
    return html`<div
        aria-describedby=${readable ? 'helix-chart-summary' : nothing}
        aria-label=${this.named || 'Heatmap'}
        part="strip"
        id=${CHART_PLOT}
        role=${readable ? 'application' : 'img'}
        style="--heatmap-rows: ${this.rowCount}"
        tabindex=${readable ? '0' : nothing}
        @click=${this.onClick}
        @pointerover=${this.onPointerOver}
        @pointerleave=${this.onPointerLeave}
      >
        ${
          cells.length === 0
            ? nothing
            : cells.map((reading, index) => {
                const tone = toneOf(reading, bounds, palette)
                /* **Two templates rather than one with a conditional style, and
                   the reason is that an absent tone has to mean an absent
                   declaration.** `--heatmap-tone: var(--heatmap-tone-undefined)`
                   is not an unset property, it is a property set to the
                   guaranteed-invalid value, and `var(--heatmap-tone, …)` then
                   declines to use its own fallback because the property *is*
                   set. An untoned cell came out transparent rather than taking
                   the quiet ground the sheet has for it. */
                const active = this.pointer.at === index
                const picked = chosen.has(keys[index] ?? '')
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
        }
        ${this.renderTooltip()}
      </div>
      ${cells.length === 0 && this.sourceKnown ? html`<p part="empty">${this.emptyText}</p>` : nothing}
      <div part="footer">
        <span part="start"><slot name="start"></slot></span>
        <span part="summary"><slot name="summary"></slot></span>
        <span part="end"><slot name="end"></slot></span>
      </div>${readable ? this.renderOverview(cells) : nothing}${
        this.status.spoken
          ? html`<span part="selection" role="status">${this.status.said}</span>`
          : nothing
      }`
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
    const most = row ? `${this.busiestLabel}: ${row.label}${text === '' ? '' : `, ${text}`}` : ''
    const sum = `${this.totalLabel} ${formatNumbers(this.locale)(total)}`
    return html`<p id="helix-chart-summary" part="overview">${most ? `${most}; ${sum}` : sum}.</p>`
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
  protected renderTooltip(): TemplateResult | typeof nothing {
    const at = this.pointer.at
    if (at < 0) {
      return drawTooltip(
        this.sourceRows,
        -1,
        this.tag('tooltip'),
        undefined,
        undefined,
        this.pointer,
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
      this.pointer,
    )
  }

  /**
   * Which drawn cell the pointer is over, or -1.
   *
   * `pointerover` on the strip rather than a listener per cell: the event
   * bubbles, so one handler covers however many cells there are, and unlike
   * `mouseover` it is delivered for a pen.
   */
  private readonly onPointerOver = (event: PointerEvent): void => {
    /* A mouse or a pen, the rule every chart's pointer keeps: a touch opened
       the bubble under the finger and left it there after the finger lifted. */
    if (!this.pointer.accepts(event)) {
      return
    }
    const cell = (event.target as Element | null)?.closest?.('[part~="cell"]')
    const index = Number(cell?.getAttribute('data-index') ?? -1)
    this.pointer.set(Number.isInteger(index) ? index : -1)
  }

  /* A cell the keys chose stays when the pointer leaves, as on every chart. */
  private readonly onPointerLeave = (): void => {
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
