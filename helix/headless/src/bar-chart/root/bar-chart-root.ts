import {
  byRow,
  CategoryAxisController,
  CHART_PLOT,
  columnPoints,
  customElement,
  drawTooltip,
  extent,
  formatNumbers,
  formatWords,
  HelixElement,
  HelixReadingChangeEvent,
  HelixReadingPressEvent,
  linear,
  linePath,
  MIRROR_RULE,
  MixinChartSource,
  MixinChartStatus,
  PLOT_HEIGHT,
  PLOT_WIDTH,
  type Point,
  type Row,
  type Series,
  type SeriesPoint,
  seriesIndex,
  seriesKey,
  seriesNames,
  ticks,
  unbroken,
  words,
  wordsLocale,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, svg, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { type StackEnd, stackEnds, stackedReadings, stackFarEnds, stackSpans } from '../stack.js'
import '../../tooltip/index.js'

/**
 * A cell's `data-tone`, where it is a name a custom property can carry, or
 * `undefined`. The name is written into a `style` attribute, so anything but
 * letters, digits, and hyphens is refused rather than read as more CSS.
 */
const toned = (tone: string | undefined): string | undefined =>
  tone && /^[a-z][a-z0-9-]*$/.test(tone) ? tone : undefined

/** Four decimals, as a path of columns is written: a column a hundredth of a pixel thick keeps its width. */
const round = (value: number): number => Math.round(value * 10_000) / 10_000

/**
 * How thick a column drawn again for the reading shown is at least, in CSS
 * pixels, where the columns are thinner than that, so a reader sees which one
 * the tooltip describes.
 */
const SHOWN_THICKNESS = 2

/** Where a column stands, in the drawing's own units. */
interface ColumnBox {
  /** Where it starts across the categories. */
  across: number
  /** Where it starts along the measure. */
  along: number
  /** How long it is along the measure. */
  size: number
  /** How thick it is across the categories. */
  thickness: number
}

/** One series drawn as columns: its place in the slot and its place in the palette. */
interface ColumnSeries {
  one: Series
  slots: (SeriesPoint | undefined)[]
  tone: number
}

/** What every render of one set of readings shares: the scales, and what is drawn from them. */
interface BarFrame {
  /** The domain of the primary scale, zero at both ends. */
  domain: [number, number]
  /** Where zero is on the primary scale. */
  floor: number
  /** The domain of the second scale, where `secondary` names a series. */
  other: [number, number]
  /** The scale the tooltip measures a category's far end on, over every series shown. */
  reach: (value: number) => number
  /** The widest number on either axis, in characters. */
  widest: number
  y: (value: number) => number
  z: ((value: number) => number) | undefined
}

/**
 * @summary A chart that draws a table's categories as columns.
 *
 * @description
 * Every bar is measured from zero, and no property changes the baseline,
 * because a bar's length is its value. To show the differences between values,
 * use a line chart.
 *
 * The labels are HTML beside the drawing. An `<svg>` that fills its box scales
 * the text inside it: the same `font-size` renders at 10px in a narrow chart
 * and 43px in a wide one, and SVG has no setting that keeps text at one size
 * the way `vector-effect` does for strokes.
 *
 * The table is the accessible representation, and the drawing is hidden from
 * screen readers, so they get the numbers themselves. The `summary` part names
 * the chart, from `label` or the table's caption, and gives each series' highest
 * reading.
 *
 * **The plot is read by key.** It takes focus, named by `label` or the caption.
 * The arrows along the categories move from one to the next, which is left and
 * right for columns and up and down for `orientation="horizontal"`. Home and
 * End go to the first and the last, and the other pair of arrows moves among
 * the series of a category. The tooltip follows, the `live` part says the
 * reading in words, and Escape puts the tooltip away.
 *
 * The component writes the custom properties below with numbers it computes,
 * and the stylesheet that draws the chart reads them. Do not set them yourself.
 *
 * **A tap shows the reading under it**, and keeps it until a tap lands
 * elsewhere. `helix-reading-change` says each move of the reading, by pointer,
 * tap or key, and `helix-reading-press` says a reading was clicked, tapped, or
 * pressed with Enter or Space, for a page that opens what a reading stands for.
 *
 * **A cell's `data-tone` colors its own bar**, such as `data-tone="primary"`
 * on the one reading a chart is about, so one column of numbers can single
 * a bar out without a second column to color it. Without one, a bar takes
 * its series' color.
 *
 * **A chart of more columns than its plot has pixels draws them as paths.**
 * Each column is an element of its own, the `bar` part, while every column
 * and the space between two categories are at least a pixel of the screen.
 * Past that, the columns of each series are one path, with one more for each
 * `data-tone` and one for the columns below zero, all in one `group`. The
 * category the tooltip describes is drawn again over them as `group-active`,
 * each of its columns at least two pixels thick, so a reader sees which one
 * it is.
 *
 * **`data` takes the readings as data** where the page has no table to point
 * `for` at, in a table's shape: the column headings, then one row per reading
 * with its label first. A table is still the better source where the page can
 * show one, since it reads before any script runs.
 *
 * **A chart with nothing to draw says so.** A table with no readings shows
 * `empty-text`, "No readings", in the plot, and `loading` shows `loading-text`
 * there until readings arrive. The `empty` and `loading` slots take markup in
 * their place, such as a link to add the first reading.
 *
 * **Keyboard.** The plot is one tab stop.
 *
 * | Key | What it does |
 * |---|---|
 * | Tab | Moves focus to the plot and shows the first reading. |
 * | Right, Left | Moves to the next or the previous reading. On a right-to-left page, Left moves to the next. |
 * | Down, Up | Moves among the series of the reading. With one series, moves to the next or the previous reading. |
 * | Down, Up under `orientation="horizontal"` | Moves to the next or the previous reading, and Right and Left move among the series. |
 * | Home, End | Moves to the first or the last reading. |
 * | Page Down, Page Up | Moves a tenth of the readings on or back. |
 * | Enter, Space | Presses the reading shown, which sends `helix-reading-press`. |
 * | Escape | Puts the reading and its tooltip away. |
 *
 * @since 0.1.0
 * @status stable
 * @category charts
 * @aliases Column Chart, Categorical Chart
 * @documentation https://fusion.dev/helix/components/bar-chart
 *
 * @slot empty - Content shown in place of the drawing when the table has no readings, such as a link to add the first. Falls back to `empty-text`.
 * @slot loading - Content shown in place of the drawing while `loading` is set and there are no readings yet. Falls back to `loading-text`.
 *
 * @event {HelixReadingChangeEvent} helix-reading-change - The reading shown moved, or was put away: `index` is the row, or `-1` for none, with its `label`, the `series` the keys rest on, and the `pointerType` that moved it.
 * @event {HelixReadingPressEvent} helix-reading-press - A reading was clicked, tapped, or pressed with Enter or Space, with the same detail as `helix-reading-change`.
 *
 * @csspart axis - The numbers of one scale: the primary under `value-axis`, and both when `secondary` splits the chart into two scales.
 * @csspart band - The category band under the pointer.
 * @csspart bar - One column. Under `stacked`, one segment of a category's column. Past one column a pixel, a path of the columns of one series that share a `data-tone` and a side of zero, each a rectangle in it.
 * @csspart bar-end - The bar at a column's far end, the end away from zero, which is the end to round. A column standing alone is its own far end. Under `stacked`, the last positive segment above zero and the last negative one below it. Its `data-end` is `positive` or `negative`. A blank or a zero is never the end. Set together with `bar`, and never on a path of columns.
 * @csspart bar-end-negative - A far end below zero, whose far end is its bottom, or its inline start when the bars run across. Set together with `bar-end`.
 * @csspart bar-negative - A bar below zero, standing alone or any segment of a stack below it, whose base is its top, or its inline end when the bars run across. On a path of columns, every column in it is below zero. Set together with `bar`.
 * @csspart bar-wash-end - The far stop of a bar's gradient, where one is used.
 * @csspart bar-wash-start - The stop of a bar's gradient at its base.
 * @csspart baseline - The line the columns stand on.
 * @csspart empty - The words in place of the drawing when the table has no readings: the `empty` slot, falling back to `empty-text`. Not drawn while the table cannot be read yet, on the server and during hydration.
 * @csspart gridline - One gridline across the plot, drawn when `gridlines` is set.
 * @csspart group - One category's columns, together. Past one column a pixel, every category's columns, together.
 * @csspart group-active - The group the tooltip describes. Set together with `group`. Past one column a pixel, that category's columns drawn again over the rest, each at least two pixels thick.
 * @csspart label - One category's name, placed along the row by `--chart-label-start` and `--chart-label-size`, or down the column under `orientation="horizontal"`, with its text centered. Only the names that fit are drawn, the first and the last always.
 * @csspart labels - The row of category names, or the column of them under `orientation="horizontal"`, which the names share: lay it out as one grid cell they all stand in.
 * @csspart line - A series drawn as a line, named in `lines`.
 * @csspart live - The readout: a polite live region that says the reading the keys moved to. Hide it visually.
 * @csspart loading - The words in place of the drawing while `loading` is set and there are no readings: the `loading` slot, falling back to `loading-text`.
 * @csspart mark - The invisible point the tooltip is anchored to.
 * @csspart plot - The drawing, which takes focus to be read by key. With nothing to draw, a group named as the chart is, holding the `empty` or `loading` part.
 * @csspart sonify - The button that plays the chart as sound, under `sonify`.
 * @csspart summary - The chart's name and each series' highest reading, written as a sentence for screen readers. Hide it visually.
 * @csspart svg - The drawing surface the bars and lines sit on.
 * @csspart table - The readings as a table, for a screen reader, rendered only where they were drawn from `data`, a page of them at a time past a few hundred. Hide it visually.
 * @csspart table-pages - Which readings a page of the `table` holds, and the buttons that show the previous and the next page, rendered only while it holds a page. Hide it visually.
 * @csspart tick - One number on an axis.
 * @csspart tooltip-anchor - The `Tooltip` element itself.
 * @csspart tooltip-arrow - The tooltip's arrow, forwarded from `Tooltip`.
 * @csspart tooltip-arrow-bottom - The arrow while the bubble is below the reading, on the bubble's top edge. Set together with `tooltip-arrow`.
 * @csspart tooltip-arrow-left - The arrow while the bubble is left of the reading, on the bubble's right edge. Set together with `tooltip-arrow`.
 * @csspart tooltip-arrow-right - The arrow while the bubble is right of the reading, on the bubble's left edge. Set together with `tooltip-arrow`.
 * @csspart tooltip-arrow-top - The arrow while the bubble is above the reading, on the bubble's bottom edge. Set together with `tooltip-arrow`.
 * @csspart tooltip-cell - One column's name and value inside the tooltip.
 * @csspart tooltip-cell-current - The cell the series keys rest on, while they rest there. Set alongside `tooltip-cell`.
 * @csspart tooltip-label - The reading's category name inside the tooltip.
 * @csspart tooltip-name - A column's name inside the tooltip.
 * @csspart tooltip-surface - The tooltip bubble, forwarded from `Tooltip`.
 * @csspart tooltip-surface-bottom - The bubble while it is below the reading. Set together with `tooltip-surface`.
 * @csspart tooltip-surface-left - The bubble while it is left of the reading. Set together with `tooltip-surface`.
 * @csspart tooltip-surface-right - The bubble while it is right of the reading. Set together with `tooltip-surface`.
 * @csspart tooltip-surface-top - The bubble while it is above the reading. Set together with `tooltip-surface`.
 * @csspart tooltip-value - A column's value inside the tooltip.
 *
 * @cssproperty --bar-chart-axis - The width of an axis, in `ch`, set from the widest number on it. The chart sets it on the axis itself, and only when the categories run along the bottom. In a horizontal chart the axis is a row, one line high.
 * @cssproperty --bar-chart-secondary - The color of the secondary axis, when one series is on it. The chart sets it from that series' `--chart-series-*` property, so the axis is drawn in whatever color that property resolves to.
 * @cssproperty --bar-chart-tone-accent - The color of a bar whose cell says `data-tone="accent"`.
 * @cssproperty --bar-chart-tone-danger - The color of a bar whose cell says `data-tone="danger"`.
 * @cssproperty --bar-chart-tone-info - The color of a bar whose cell says `data-tone="info"`.
 * @cssproperty --bar-chart-tone-muted - The color of a bar whose cell says `data-tone="muted"`.
 * @cssproperty --bar-chart-tone-primary - The color of a bar whose cell says `data-tone="primary"`. A tone with no property of its own falls back to the bar's series color, and the same holds for a name you define.
 * @cssproperty --bar-chart-tone-success - The color of a bar whose cell says `data-tone="success"`.
 * @cssproperty --bar-chart-tone-warning - The color of a bar whose cell says `data-tone="warning"`.
 * @cssproperty --chart-bar-wash - The gradient for a bar, named per bar so the styled
 *   tier can use it as the `fill`. It is always drawn, and used only when
 *   `wash="gradient"` is set.
 * @cssproperty --chart-label-size - How much of the row a category's name has room for, as a percentage, or of the column under `orientation="horizontal"`. Written by the component on each `label`.
 * @cssproperty --chart-label-start - Where a category name's room starts along the row, as a percentage from the inline start, or down the column from the top under `orientation="horizontal"`. Written by the component on each `label`.
 *
 * @cssstate active - While a reading is shown, under the pointer or the keys, with its tooltip open.
 * @cssstate empty - While the `empty` part stands in the plot.
 * @cssstate loading - While the `loading` part stands in the plot.
 */
@customElement('helix-headless-bar-chart')
export class HelixHeadlessBarChart extends MixinChartStatus(MixinChartSource(HelixElement)) {
  protected static override markRules = [MIRROR_RULE]

  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-bar-chart': { highestLabel: 'Höchster Wert' } })`.
   */
  static words = 'helix-bar-chart'

  /**
   * Sends the reading's moves and presses as `helix-reading-change` and
   * `helix-reading-press`, which the pointer hears. Here and not in a
   * constructor, where the manifest's analyzer reads the assignment as a
   * member of this class.
   */
  override connectedCallback(): void {
    super.connectedCallback()
    this.pointer.onReading = (heard, detail) =>
      this.dispatchEvent(
        heard === 'press'
          ? new HelixReadingPressEvent(detail)
          : new HelixReadingChangeEvent(detail),
      )
  }

  /**
   * Which gridlines are drawn across the plot, if any.
   *
   * Absent draws none. `value` rules the axis the columns are *measured* on,
   * `category` rules the axis they are *arranged* on with one through each
   * group whose name is drawn, and `both` draws both. Which of those is horizontal turns with
   * `orientation`, because a rule belongs to an axis and not to a screen edge.
   *
   * **A bare `gridlines` means `value`**, and so does anything unrecognized: an
   * unrecognized value that draws nothing is indistinguishable from the
   * attribute being absent, which is the one thing a reader cannot debug.
   *
   * `category` is the quieter half of this on a bar chart: columns already
   * divide the categories by being separate columns, and a rule through each
   * one is a second statement of the same fact. It earns its place on a chart
   * of many thin bars, where the eye has stopped counting.
   *
   * Furniture rather than data, so the rules are inside the `aria-hidden` plot
   * and reach no reader through the table.
   */
  @property()
  gridlines?: 'both' | 'category' | 'value'

  /**
   * The name the summary gives each series' highest reading, `{highestLabel}`
   * in `summary-label`.
   */
  @words
  @property({ attribute: 'highest-label' })
  highestLabel = 'Highest'

  /**
   * The names of the series to draw as lines. The other series are drawn as
   * columns.
   *
   * Separated by whitespace or commas and matched against the column headings
   * the table gives, so a chart says `lines="Margin"` rather than counting
   * columns. Names because they are what the table already carries and what the
   * legend already shows: an index is a fourth place the column order is
   * written down and the first one to go stale when somebody moves a column.
   *
   * **This says which mark a series takes and nothing about which scale it is
   * measured on.** Named here alone, a line shares the columns' domain, so it
   * says something comparable to the columns beside it.
   *
   * The other half of a combination chart, a count against a percentage on a
   * scale of its own, is `secondary`, which is a separate property because it
   * is a separate question and because the two compose: `with-a-second-axis`
   * ships naming one series in both. The argument for why a second scale is opt
   * in, and why setting it labels both axes, is written there.
   *
   * A line among columns measures from zero, because the columns do and they
   * share the axis. So does a line on the second scale, which is that scale's
   * own rule rather than this one's.
   */
  @property()
  lines?: string

  /**
   * Where the categories run. Leave it unset for categories along the bottom,
   * or set `horizontal` to run them down the side.
   *
   * Absent is columns. `horizontal` is the one to reach for when the category
   * names are words rather than dates: a row of long names either overlaps or
   * turns on its side, and neither is as readable as putting them down the left
   * where they read normally.
   *
   * Named `orientation` because `direction` is taken: `Trend` uses it in the
   * same group for which way a number moved.
   */
  @property({ reflect: true })
  orientation?: 'horizontal'

  /**
   * The names of the series measured against a second scale of their own.
   *
   * Separated and matched the way `lines` is, against the column headings the
   * table gives. Opt in: absent, every series shares one domain, which is what
   * makes a chart comparable and is the right default.
   *
   * **The scale, and `lines` is the mark.** The two are separate properties
   * because they answer separate questions and a series usually wants both:
   * a percentage beside a count is drawn as a line *and* measured on its own
   * axis, which is what `with-a-second-axis` writes out. Neither implies the
   * other, so a series can be a line on the shared scale and a column can have
   * a scale to itself.
   *
   * **Two scales on one frame let an author put any two shapes in any relation
   * by choosing the ranges, and a reader cannot see it happening.** That is not
   * a caveat, it is what the feature does: a line that crosses the columns
   * twice and a line that never touches them can be the same two series drawn
   * against different ranges. It earns its place when the two quantities are
   * genuinely incomparable, a count against a percentage, and it is a way to
   * mislead in every other case.
   *
   * **So it draws its axes**, and that is not optional here. The chart renders
   * no value axis at all when there is one scale, because the columns are
   * measured against each other and a reader needs no numbers to do that. With
   * two, a reader has no way of knowing there are two, let alone which series
   * is on which, so both scales are labeled the moment this is set. An
   * unlabeled second axis is the deceptive case rather than the tidy one.
   *
   * The grid stays on the primary axis, since a rule measured against two
   * scales at once is a rule that means nothing. The tooltip is unaffected: it
   * has always shown every column's own number, which is the reader's way out
   * of any scale question the picture raises.
   */
  @property({ reflect: true })
  secondary?: string

  /**
   * Stacks a category's columns into one, each series standing on the ones
   * before it, so the column's height is the category's total.
   *
   * Absent stands them side by side, as it always did. A negative reading
   * hangs below zero on the negatives before it, so neither direction hides
   * the other. The scale fits the stacks. A series
   * in `lines` is still a line, measured on its own reading; columns on the
   * second scale stack among themselves.
   */
  @property({ reflect: true, type: Boolean })
  stacked = false

  /**
   * The summary's sentence. `{highestLabel}` is `highest-label`, and
   * `{readings}` each series' highest reading: the series, the category and
   * the reading as the table writes it.
   */
  @words
  @property({ attribute: 'summary-label' })
  summaryLabel = '{highestLabel}: {readings}.'

  /**
   * Draws the numbers of the scale the bars are measured on, the `axis` part,
   * at the levels `gridlines` rules: down the side of columns, and along the
   * bottom of bars under `orientation="horizontal"`.
   *
   * Absent draws none with one scale, since bars compared with each other need
   * no numbers. With `secondary` both scales are drawn whatever this says.
   */
  @property({ attribute: 'value-axis', reflect: true, type: Boolean })
  valueAxis = false

  /**
   * Measures the axis the categories run along and says which of their names
   * fit on it, which are the names drawn and the groups `category` gridlines
   * rule. Down the side under `orientation="horizontal"`, where a name is one
   * line tall.
   */
  private readonly names = new CategoryAxisController(this, () =>
    this.orientation === 'horizontal' ? 'block' : 'inline',
  )

  /** The series names on the second scale, lowercased and trimmed. */
  private get scaled(): Set<string> {
    return new Set(seriesNames(this.secondary))
  }

  /** The series names drawn as a line, lowercased and trimmed for matching. */
  private get lined(): Set<string> {
    return new Set(seriesNames(this.lines))
  }

  /** Whether the levels are ruled, which is every value but `category`. */
  protected get rulesValue(): boolean {
    return this.gridlines !== undefined && this.gridlines !== 'category'
  }

  /** Whether each category is ruled, which only two values ask for. */
  protected get rulesCategory(): boolean {
    return this.gridlines === 'both' || this.gridlines === 'category'
  }

  /**
   * Tells the pointer which way the categories run.
   *
   * In `willUpdate` because `orientation` is a property a consumer can change at
   * any time, and the controller resolves a reading from whichever axis it was
   * last told about: set once at connect, a chart turned sideways after that
   * goes on reading x and answers with the same row wherever the pointer goes.
   *
   * `willUpdate` and not `updated`, because SSR calls the first and not the
   * second, and a value the server and the client disagree about is worse than
   * one neither has.
   */
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed)
    this.pointer.axis = this.orientation === 'horizontal' ? 'block' : 'inline'
  }

  /** The category names, held against the rows they were read from. */
  private categorized: { categories: string[]; rows: Row[] } | undefined

  /** The scales last worked out, held while the series and all that sizes them are the same. */
  private framed: { frame: BarFrame; key: string; series: Series[] } | undefined

  protected override render(): TemplateResult {
    const series = this.series
    /* Every row is a category, whether or not each series has a reading in
       it. Taken from the first series' points, a blank in its column took the
       category off the axis and every other series slid one place left. */
    const rows = this.sourceRows
    if (this.categorized?.rows !== rows) {
      this.categorized = { categories: rows.map((row) => row.label), rows }
    }
    const categories = series.length === 0 ? [] : this.categorized.categories
    if (categories.length === 0) {
      return this.renderEmpty()
    }

    const { domain, floor, other, widest, y, z } = this.frameOf(series, categories.length)
    const sideways = this.orientation === 'horizontal'

    /* The second axis wears its series' color when exactly one series is on it,
       which is the case worth helping and the only one a single color can
       describe honestly: with two sharing it, painting the axis either of their
       colors says it belongs to that one.
     *
       **Written onto the axis and not onto the plot.** The axis is the plot's
       sibling, being a column of the host grid, and a custom property inherits
       down and never sideways: written onto the plot, both axes come out the
       neutral. */
    const scaled = this.scaled
    const lone = series.filter((one) => scaled.has(seriesKey(one.name)))
    const tint =
      lone.length === 1 && lone[0] !== undefined
        ? `--bar-chart-secondary: var(--chart-series-${seriesIndex(series.indexOf(lone[0]))})`
        : undefined

    return html`${
      z === undefined && !this.valueAxis
        ? nothing
        : this.renderAxis(y, domain, 'primary', sideways, widest)
    }${this.renderPlot(series, categories, y, domain, floor, z)}${
      z === undefined ? nothing : this.renderAxis(z, other, 'secondary', sideways, widest, tint)
    }${this.renderLabels(categories)}${this.renderSummary(series)}${this.renderSonify()}${this.renderTable()}`
  }

  /**
   * The scales every series is drawn against, and what the plot reads from
   * them, held while the readings and every property that sizes them are the
   * same.
   *
   * **A render the pointer asks for works out nothing here.** Every move of the
   * pointer across the plot is a render, and the extent of every reading
   * walked again on each one was work a move does not change. A series is a
   * new object whenever the table is read again, so an edit works it out
   * afresh.
   */
  private frameOf(series: Series[], count: number): BarFrame {
    const key = [
      count,
      this.stacked,
      this.orientation,
      this.lines,
      this.secondary,
      this.valueAxis,
      wordsLocale(this),
      series.map((one) => (this.showsSeries(one.name) ? 1 : 0)).join(''),
    ].join(' ')
    if (this.framed?.series === series && this.framed.key === key) {
      return this.framed.frame
    }

    /* Zero at both ends, so a series that goes negative gets a baseline inside
       the box and its columns hang below it. `extent` over every series at once
       rather than per series, because two series drawn to different scales are
       two charts sharing a picture. */
    const scaled = this.scaled
    const own = (one: Series): boolean => scaled.has(seriesKey(one.name))
    /* Two extents where a series asked for its own, and the primary is taken
       over the series that did *not*: measuring the primary over everything
       would stretch it to hold numbers no column is drawn against, which is the
       one thing splitting the axes was meant to stop. Empty on either side
       falls back to the whole set, so `secondary` naming a column that is not
       there leaves a chart rather than a blank. */
    /* Over the series drawn, so hiding one from a legend fits the scale to
       the rest. */
    const shown = series.filter((one) => this.showsSeries(one.name))
    const values = shown.flatMap((one) => one.points.map((point) => point.value))
    /* Stacked, a scale holds the stacks: the lines' own readings and the top
       and foot of each category's columns. */
    const lined = this.lined
    const readingsOf = (group: Series[]): number[] =>
      this.stacked
        ? stackedReadings(group, count, (one) => lined.has(seriesKey(one.name)))
        : group.flatMap((one) => one.points.map((point) => point.value))
    const on = (which: (one: Series) => boolean): number[] => {
      const found = readingsOf(shown.filter(which))
      return found.length > 0 ? found : values.length > 0 ? values : [0]
    }
    const [low, high] = extent(scaled.size === 0 ? on(() => true) : on((one) => !own(one)))
    /* **The range is inverted for columns and not for bars**, which is the
       whole of what makes the two directions different arithmetic rather than
       one drawing turned on its side. SVG counts down from the top, so a column
       growing upward needs `[PLOT_HEIGHT, 0]`; a bar growing rightward is already
       going the way x counts, so it takes `[0, PLOT_HEIGHT]`.
     *
     * Reusing the inverted scale for both puts the longest bar at x=0 and every
       shorter one hard against the right edge, growing away from the baseline
       instead of out of it. */
    const domain: [number, number] = [Math.min(0, low), Math.max(0, high)]
    const range: [number, number] =
      this.orientation === 'horizontal' ? [0, PLOT_HEIGHT] : [PLOT_HEIGHT, 0]
    const y = linear(domain, range)
    const floor = y(0)

    const [second, top] = extent(scaled.size > 0 ? on(own) : [0])
    const other: [number, number] = [Math.min(0, second), Math.max(0, top)]
    const z = scaled.size > 0 ? linear(other, range) : undefined

    /* Widest number on either scale, in characters, so the axis column is the
       size of its own contents.
     *
     * The ticks are absolutely positioned, which is what puts each one on the
     * level it names and also what stops any of them contributing a width: an
     * axis of six numbers laid out that way is an empty box. The count is known
     * here and unknowable to a selector, so it is written as a length and the
       stylesheet reads it. */
    const format = formatNumbers(wordsLocale(this))
    const levels = [...ticks(domain), ...(z === undefined ? [] : ticks(other))]
    const widest =
      z === undefined && !this.valueAxis
        ? 0
        : Math.max(1, ...levels.map((level) => format(level).length))

    /* The tooltip stands off the far end of a category's columns, measured
       over every series shown, on whichever scale each is drawn. */
    let reach = y
    if (scaled.size > 0) {
      const [near, far] = extent(readingsOf(shown).concat(0))
      reach = linear([Math.min(0, near), Math.max(0, far)], range)
    }

    const frame = { domain, floor, other, reach, widest, y, z }
    this.framed = { frame, key, series }
    return frame
  }

  /** Each series' highest reading, held by series, which the summary says on every render. */
  private highests = new WeakMap<Series, SeriesPoint | undefined>()

  private highestOf(one: Series): SeriesPoint | undefined {
    if (!this.highests.has(one)) {
      let best: SeriesPoint | undefined
      for (const point of one.points) {
        if (best === undefined || point.value > best.value) {
          best = point
        }
      }
      this.highests.set(one, best)
    }
    return this.highests.get(one)
  }

  /** Each series laid out one slot per category, held by series. */
  private slots = new WeakMap<Series, (SeriesPoint | undefined)[]>()

  private slotsOf(one: Series, count: number): (SeriesPoint | undefined)[] {
    let held = this.slots.get(one)
    if (held === undefined || held.length !== count) {
      held = byRow(one, count)
      this.slots.set(one, held)
    }
    return held
  }

  /**
   * What a reader who cannot see the columns is told: the chart's name and
   * each series' highest reading.
   *
   * The highest, because which category leads is the question a bar chart is
   * read for, and the table beside it has every other number. The reading is
   * written the way the table writes it, such as `$128k` for `128000`. A
   * series a legend hid is not drawn and is not said.
   */
  protected renderSummary(series: Series[]): TemplateResult {
    const rows = this.sourceRows
    const columns = this.plottedColumns
    const highest = series.flatMap((one, depth) => {
      const top = this.highestOf(one)
      if (top === undefined || !this.showsSeries(one.name)) {
        return []
      }
      const text = rows[top.at]?.cells[columns[depth] ?? -1]?.text ?? String(top.value)
      return [`${one.name} ${top.label} ${text}`]
    })
    const named = this.named ? `${this.named}. ` : ''
    const said = formatWords(this, 'summaryLabel', {
      highestLabel: this.highestLabel,
      readings: highest.join('; '),
    })
    return html`<p id="helix-chart-summary" part="summary">${named}${said}</p>`
  }

  /**
   * The columns themselves, behind a seam the styled tier can move.
   *
   * `aria-hidden`, because the table it was read from is the readable version
   * and a screen reader hearing both hears the same numbers twice.
   */
  protected renderPlot(
    series: Series[],
    categories: string[],
    y: (value: number) => number,
    domain: [number, number],
    floor: number,
    z?: (value: number) => number,
  ): TemplateResult {
    const sideways = this.orientation === 'horizontal'
    const slot = 100 / categories.length
    /* Split first, because the columns share the slot between themselves and a
       line takes none of it. Sized by every series instead, a chart of two
       columns and one line draws both columns two thirds as wide and leaves a
       third of every slot empty, for a mark that is not in the slot at all. */
    const lined = this.lined
    /* Kept with the index it has among *all* the series, because a column needs
       two different numbers and they stopped being the same the moment one
       series could be a line. `depth` is its place in the slot, so the columns
       stand shoulder to shoulder with no gap where a line was; `tone` is its
       place in the palette, so it keeps the color the legend gives it.
     *
       Passing the first for both moves a series into its neighbor's color as
       well as its slot: with `Target` drawn as a line, a chart of four series
       paints three columns in the first three colors and the line in the third
       one as well. */
    const scaled = this.scaled
    const own = (one: Series): boolean => scaled.has(seriesKey(one.name))
    /* The scale a series is measured against, resolved once per series rather
       than per point. `z` is absent unless `secondary` named something, so the
       ordinary chart takes exactly the path it took before this existed. */
    const against = (one: Series): ((value: number) => number) =>
      z !== undefined && own(one) ? z : y
    const columns: ColumnSeries[] = series
      .map((one, index) => ({ one, slots: this.slotsOf(one, categories.length), tone: index }))
      /* A series a legend hid takes no room in the slot, and keeps its tone. */
      .filter(({ one }) => !lined.has(seriesKey(one.name)) && this.showsSeries(one.name))
    /* **The stride is what the columns share and the thickness is what they
       draw.** Back to back, two columns meet on one coordinate and each one's
       edge is the other's: an outlined chart then shows a single line between
       them rather than two, and a bar looks as though it were missing a side.
       A gap is also just the right way to draw a group, which is why the split
       stays whether anything is outlined or not.

       Centered in the stride rather than flush against it, so the gap between two
       columns is the same size everywhere and the group sits where it did. One
       series has no neighbor to be separated from and keeps the full stride. */
    /* Stacked, the columns of a category are one column, so it takes the
       whole stride and no gap. */
    const abreast = this.stacked ? 1 : columns.length
    /* The share of a category's room one column is thick, which the column
       drawn again for the reading shown needs to widen the room it stands in. */
    const share = (0.72 / Math.max(abreast, 1)) * (abreast > 1 ? 0.92 : 1)

    /* **The geometry is computed for the axis it is drawn on, not rotated onto
       it.** Turning the whole plot with `rotate: 90deg` is the shorter CSS and
       does not work: a rotation is about the element's own center, so the
       drawing leaves its grid cell entirely while the labels, which are a
       separate row, stay where they were. What that produces is one column
       floating beside a list of names.
     *
     * Swapping the two axes here costs one branch and keeps every other fact
     * about the chart the same. `value` runs along x when the bars are
     * sideways and along y otherwise; `category` takes the other one.
     *
     * `room` is the share of the axis the category's columns stand in, its
     * slot, and wider for a category drawn again for the reading shown,
     * centered on the slot. */
    const boxOf = (
      value: number,
      index: number,
      depth: number,
      scale: (value: number) => number,
      from?: number,
      room = slot,
    ): ColumnBox => {
      const stride = (room * 0.72) / Math.max(abreast, 1)
      const gap = abreast > 1 ? stride * 0.08 : 0
      const at = scale(value)
      const base = from === undefined ? floor : scale(from)
      /* `0.36` is half of the 0.72 of the room the group takes, and it is
         what centers the group in its slot: where the room is the slot, the
         group starts `0.14` of it in, half of what the group leaves over. The
         numbers are one decision written twice: move the 0.72 alone and every
         group slides off center with nothing on screen to say so. */
      return {
        across: (index + 0.5) * slot - room * 0.36 + depth * stride + gap / 2,
        along: Math.min(base, at),
        size: Math.abs(base - at),
        thickness: stride - gap,
      }
    }
    const bar = (
      value: number,
      index: number,
      depth: number,
      tone: number,
      scale: (value: number) => number,
      from?: number,
      end?: StackEnd,
      named?: string,
      room?: number,
    ): TemplateResult => {
      const { across, along, size, thickness } = boxOf(value, index, depth, scale, from, room)
      const ink = toned(named)
      const paint = this.paintOf(tone, ink)
      /* Compared out here, because every quoted word inside a part's
         interpolation is read as a name the element can carry. A segment
         grows down from where it starts, or from zero when it stands alone. */
      const below = end === 'negative'
      const sinks = value < (from ?? 0)
      return sideways
        ? svg`<rect
            data-end=${end ?? nothing}
            data-series=${seriesIndex(tone)}
            data-tone=${ink ?? nothing}
            height=${thickness}
            style=${paint}
            part="bar${sinks ? ' bar-negative' : ''}${end ? ' bar-end' : ''}${below ? ' bar-end-negative' : ''}"
            width=${size}
            x=${along}
            y=${across}
          />`
        : svg`<rect
            data-end=${end ?? nothing}
            data-series=${seriesIndex(tone)}
            data-tone=${ink ?? nothing}
            height=${size}
            style=${paint}
            part="bar${sinks ? ' bar-negative' : ''}${end ? ' bar-end' : ''}${below ? ' bar-end-negative' : ''}"
            width=${thickness}
            x=${across}
            y=${along}
          />`
    }

    /* A category's columns, side by side or stacked, as `draw` makes each. */
    const columnsAt = <T>(
      index: number,
      draw: (
        value: number,
        depth: number,
        tone: number,
        scale: (value: number) => number,
        from: number | undefined,
        end: StackEnd | undefined,
        named: string | undefined,
      ) => T,
    ): T[] =>
      this.stacked
        ? this.renderStack(columns, index, against, draw)
        : columns.flatMap(({ slots, one, tone }, depth) => {
            const point = slots[index]
            /* A blank cell is no column at all, which is what a blank says. A
               column of no height would claim a zero. A column alone is a
               stack of one, so it is its own far end, above zero or below
               it. */
            return point === undefined
              ? []
              : [
                  draw(
                    point.value,
                    depth,
                    tone,
                    against(one),
                    undefined,
                    stackFarEnds([point.value])[0],
                    point.tone,
                  ),
                ]
          })

    const thickness = boxOf(0, 0, 0, y).thickness
    const dense = this.dense(slot, thickness)
    /* The device pixels along the axis, which a path of more categories than
       pixels is drawn to. */
    const pixel = this.unitsPerPixel() / (globalThis.devicePixelRatio || 1)
    const key = `${dense ? pixel : 'apart'} ${this.stacked} ${this.orientation} ${this.lines} ${this.secondary} ${columns.map(({ tone }) => tone).join(',')}`
    const held = this.marked
    const fresh =
      held === undefined ||
      held.series !== series ||
      held.y !== y ||
      held.z !== z ||
      held.floor !== floor ||
      held.count !== categories.length ||
      held.key !== key
    let marks: TemplateResult[][] | TemplateResult
    if (!fresh) {
      marks = held.marks
    } else if (dense) {
      marks = this.renderPaths(
        { abreast, count: categories.length, pixel, sideways, slot },
        (index, add) =>
          columnsAt(index, (value, depth, tone, scale, from, _end, named) =>
            add(boxOf(value, index, depth, scale, from), {
              depth,
              ink: toned(named),
              sinks: value < (from ?? 0),
              tone,
            }),
          ),
      )
    } else {
      marks = categories.map((_, index) =>
        columnsAt(index, (value, depth, tone, scale, from, end, named) =>
          bar(value, index, depth, tone, scale, from, end, named),
        ),
      )
    }
    if (fresh) {
      this.marked = { count: categories.length, floor, key, marks, series, y, z }
    }

    const at = this.pointer.at
    /* The category the tooltip describes, drawn again over the paths, at
       least `SHOWN_THICKNESS` pixels thick: thinner than a pixel, a column a
       reader moved to by key could not be seen. */
    const room = Math.max(slot, (SHOWN_THICKNESS * this.unitsPerPixel()) / share)
    const groups = Array.isArray(marks)
      ? marks.map(
          (bars, index) =>
            /* The group the tooltip is about says so, and the stylesheet fades
               the rest. A tooltip over a chart of five categories otherwise
               makes a reader match its heading against the row of names to find
               out which columns it means. */
            svg`<g
              data-active=${at === index ? '' : nothing}
              part="group${at === index ? ' group-active' : ''}"
            >${bars}</g>`,
        )
      : svg`<g part="group">${marks}</g>${
          at < 0 || at >= categories.length
            ? nothing
            : svg`<g data-active part="group group-active">${columnsAt(
                at,
                (value, depth, tone, scale, from, end, named) =>
                  bar(value, at, depth, tone, scale, from, end, named, room),
              )}</g>`
        }`

    return html`<div
      aria-describedby=${this.named ? 'helix-chart-summary' : nothing}
      aria-label=${this.named || nothing}
      aria-labelledby=${this.named ? nothing : 'helix-chart-summary'}
      id=${CHART_PLOT}
      part="plot"
      role="application"
      tabindex="0"
    >
      <svg part="svg"
        aria-hidden="true"
        data-mirror
        preserveAspectRatio="none"
        viewBox="0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}"
        xmlns="http://www.w3.org/2000/svg"
      >
        ${
          /* **One gradient per series, rendered whether or not anything points
             at it.** A `<defs>` entry draws nothing on its own, and this tier's
             business is elements while which fill a bar takes is the styled
             tier's: `wash="gradient"` there switches `fill` to
             `--chart-bar-wash` and this is what it would find.

             Colored through the series property rather than an attribute, so
             the stops read a token this tier never names. The id resolves
             within the shadow root, so two charts on a page carrying the same
             ids stay independent. */
          svg`<defs>
            ${series.map(
              (_, index) => svg`<linearGradient
                id="helix-bar-wash-${seriesIndex(index)}"
                style="--chart-series: var(--chart-series-${seriesIndex(index)})"
                x1="0"
                x2=${sideways ? '1' : '0'}
                y1="0"
                y2=${sideways ? '0' : '1'}
              >
                <stop offset="0" part="bar-wash-start" />
                <stop offset="1" part="bar-wash-end" />
              </linearGradient>`,
            )}
            ${this.tonesOf(series).map(
              (ink) => svg`<linearGradient
                id="helix-bar-wash-tone-${ink}"
                style="--chart-series: var(--bar-chart-tone-${ink}, var(--chart-series-1))"
                x1="0"
                x2=${sideways ? '1' : '0'}
                y1="0"
                y2=${sideways ? '0' : '1'}
              >
                <stop offset="0" part="bar-wash-start" />
                <stop offset="1" part="bar-wash-end" />
              </linearGradient>`,
            )}
          </defs>`
        }
        ${this.renderGridlines(y, domain, sideways, categories.length)}
        ${
          sideways
            ? svg`<line part="baseline" x1=${floor} x2=${floor} y1="0" y2="100" />`
            : svg`<line part="baseline" x1="0" x2="100" y1=${floor} y2=${floor} />`
        }
        ${this.renderBand(categories.length, sideways)}
        ${groups}
        ${
          /* After the groups, so a line is never drawn under the columns it is
             meant to be read against. Outside them too: a group is one
             category and a line crosses all of them, so it belongs to the plot
             rather than to any one slot. */
          series.map((one) =>
            lined.has(seriesKey(one.name)) && this.showsSeries(one.name)
              ? this.renderLine(one, series.indexOf(one), slot, against(one), sideways)
              : nothing,
          )
        }
      </svg>
      ${this.renderTooltip()}
    </div>`
  }

  /**
   * The columns last drawn, held against what they were drawn from, so a
   * render the pointer asks for draws none of them again: a group of each
   * category's columns, or the paths of them all.
   */
  private marked:
    | {
        count: number
        floor: number
        key: string
        marks: TemplateResult[][] | TemplateResult
        series: Series[]
        y: (value: number) => number
        z: ((value: number) => number) | undefined
      }
    | undefined

  /** The `data-tone` names the cells give, held by the series they were read from. */
  private tones = new WeakMap<Series[], string[]>()

  /** The `data-tone` names the cells give, each a gradient of its own. */
  private tonesOf(series: Series[]): string[] {
    let held = this.tones.get(series)
    if (held === undefined) {
      const found = new Set<string>()
      for (const one of series) {
        for (const point of one.points) {
          const ink = toned(point.tone)
          if (ink !== undefined) {
            found.add(ink)
          }
        }
      }
      held = [...found]
      this.tones.set(series, held)
    }
    return held
  }

  /**
   * The paint a column takes: its tone's color and gradient where its cell
   * names a tone, and its series' otherwise.
   */
  private paintOf(tone: number, ink: string | undefined): string {
    return ink
      ? `--chart-series: var(--bar-chart-tone-${ink}, var(--chart-series-${seriesIndex(tone)})); --chart-bar-wash: url(#helix-bar-wash-tone-${ink})`
      : `--chart-series: var(--chart-series-${seriesIndex(tone)}); --chart-bar-wash: url(#helix-bar-wash-${seriesIndex(tone)})`
  }

  /**
   * The axis the categories run along, in CSS pixels: as measured, and the
   * window's before it is, which a render replaces before it is painted.
   */
  private axisPixels(): number {
    const sideways = this.orientation === 'horizontal'
    return this.names.measured || (sideways ? globalThis.innerHeight : globalThis.innerWidth) || 0
  }

  /** How many of the drawing's units a CSS pixel is along the categories, or 0 with no axis. */
  private unitsPerPixel(): number {
    const across = this.axisPixels()
    return across > 0 ? (this.orientation === 'horizontal' ? PLOT_HEIGHT : PLOT_WIDTH) / across : 0
  }

  /**
   * Whether the columns are drawn as paths: where a column, or the space
   * between two categories, is less than a pixel of the screen, so no column
   * is seen as one of its own.
   *
   * **An element a column cost an element a reading**, and two with its
   * group: 10,000 readings built 20,641 nodes and took 741 milliseconds to a
   * first frame, measured in Chromium on October 10, 2026, and every move of
   * the pointer faded 9,999 groups at 655 milliseconds a move. Within the
   * pixels a plot has, a column is an element, so the parts and the treatments
   * a page gives one column still reach it.
   */
  private dense(slot: number, thickness: number): boolean {
    const units = this.unitsPerPixel()
    const pixel = units / (globalThis.devicePixelRatio || 1)
    return units > 0 && Math.min(thickness, slot * 0.28) < pixel
  }

  /**
   * Every column as a rectangle in a path, which `each` gives a category at
   * a time: one path for the columns of each series that share a `data-tone`
   * and a side of zero, so a tone and `bar-negative` still reach the columns
   * they name.
   *
   * **A column of pixels is one rectangle a path**, from the nearest end any
   * column in it reaches to the farthest, and the series that stand side by
   * side share the pixel. A browser rasterizes every rectangle of a path each
   * time the plot repaints, and the plot repaints on every move of the
   * pointer: measured in Chromium on October 10, 2026, 10,000 columns in one
   * path cost 136 milliseconds a move. In one column of pixels the columns
   * cover what their farthest end reaches, so that rectangle is the pixels'
   * whole drawing, which is how a line keeps the lowest and the highest point
   * of each column of pixels. Columns a pixel apart or less drawn as
   * themselves were a hatch of half-covered pixels, lighter than their color
   * and striped where the hatch beat against the pixels.
   */
  private renderPaths(
    plot: { abreast: number; count: number; pixel: number; sideways: boolean; slot: number },
    each: (
      index: number,
      add: (
        box: ColumnBox,
        column: {
          depth: number
          ink: string | undefined
          sinks: boolean
          tone: number
        },
      ) => void,
    ) => void,
  ): TemplateResult {
    const { abreast, count, pixel, sideways, slot } = plot
    const paths = new Map<
      string,
      {
        d: string[]
        depth: number
        ink: string | undefined
        reaches: Map<number, [number, number]>
        sinks: boolean
        tone: number
      }
    >()
    const rectangle = (across: number, along: number, thickness: number, size: number): string => {
      const [x, y, width, height] = sideways
        ? [along, across, size, thickness]
        : [across, along, thickness, size]
      return `M${round(x)},${round(y)}h${round(width)}v${round(height)}h${-round(width)}z`
    }
    for (let index = 0; index < count; index += 1) {
      each(index, (box, { depth, ink, sinks, tone }) => {
        const key = `${tone} ${ink ?? ''} ${sinks}`
        let path = paths.get(key)
        if (path === undefined) {
          path = { d: [], depth, ink, reaches: new Map(), sinks, tone }
          paths.set(key, path)
        }
        /* Every column of pixels the category's slot reaches into. */
        const last = Math.ceil(((index + 1) * slot) / pixel) - 1
        for (let at = Math.floor((index * slot) / pixel); at <= last; at += 1) {
          const reach = path.reaches.get(at)
          if (reach === undefined) {
            path.reaches.set(at, [box.along, box.along + box.size])
          } else {
            reach[0] = Math.min(reach[0], box.along)
            reach[1] = Math.max(reach[1], box.along + box.size)
          }
        }
      })
    }
    const share = pixel / Math.max(abreast, 1)
    for (const path of paths.values()) {
      for (const [at, [near, far]] of path.reaches) {
        path.d.push(rectangle(at * pixel + path.depth * share, near, share, far - near))
      }
    }
    return svg`${[...paths.values()].map(
      ({ d, ink, sinks, tone }) =>
        svg`<path
          d=${d.join('')}
          data-series=${seriesIndex(tone)}
          data-tone=${ink ?? nothing}
          part="bar${sinks ? ' bar-negative' : ''}"
          style=${this.paintOf(tone, ink)}
        />`,
    )}`
  }

  /**
   * One category's columns stacked into one, each on the ones before it on
   * its own scale, through the pure `stackSpans`, each as `draw` makes it.
   */
  private renderStack<T>(
    columns: ColumnSeries[],
    index: number,
    against: (one: Series) => (value: number) => number,
    draw: (
      value: number,
      depth: number,
      tone: number,
      scale: (value: number) => number,
      from: number | undefined,
      end: StackEnd | undefined,
      named: string | undefined,
    ) => T,
  ): T[] {
    const scales = [...new Set(columns.map(({ one }) => against(one)))]
    return scales.flatMap((scale) => {
      const mine = columns.filter(({ one }) => against(one) === scale)
      const values = mine.map(({ slots }) => slots[index]?.value)
      const spans = stackSpans(values)
      /* The stylesheet rounds a bar at its far end. In a stack only the
         outermost segment in each direction has a far end, and the segments
         between meet square. */
      const ends = stackFarEnds(values)
      return mine.flatMap(({ slots, tone }, place) => {
        const span = spans[place]
        return span === undefined
          ? []
          : [draw(span[1], 0, tone, scale, span[0], ends[place], slots[index]?.tone)]
      })
    })
  }

  /**
   * The numbers along one scale, drawn only where there are two of them.
   *
   * **A chart with one scale renders no axis, on purpose.** Columns measured
   * against each other need no numbers to be compared, and a row of them beside
   * a small chart is furniture that makes the drawing smaller for no reading a
   * reader was going to do. With two scales that argument inverts: a reader
   * cannot tell there are two, cannot tell which series is on which, and cannot
   * recover either from the picture. So this appears with `secondary`, and
   * with one scale only where `value-axis` asks for its numbers.
   *
   * **Beside the plot and not inside it.** Inside, the numbers are drawn over
   * the drawing, and a horizontal chart shows it immediately: its value axis
   * runs along the bottom, which is where the last row of bars is. The vertical
   * case has the same fault and enough slack to hide it. The plot is also the
   * pointer's catchment and the tooltip's containing block, both measured from
   * its box, so padding it to make room would move every reading half an axis
   * to the right.
   *
   * A column of the host grid instead, which the stylesheet grows only when
   * `secondary` or `value-axis` is set. That is what the two reflect for.
   *
   * The primary hugs the edge the drawing starts at and the secondary the edge
   * it ends at: down the two sides for columns, along the bottom and top for
   * bars, which is where each axis is when the chart is turned.
   */
  protected renderAxis(
    scale: (value: number) => number,
    domain: [number, number],
    which: 'primary' | 'secondary',
    sideways: boolean,
    widest: number,
    tint?: string,
  ): TemplateResult {
    const sizing = sideways ? undefined : `--bar-chart-axis: ${widest}ch`
    const format = formatNumbers(wordsLocale(this))
    return html`<div
      aria-hidden="true"
      data-axis=${which}
      part="axis"
      style=${[sizing, tint].filter(Boolean).join('; ') || nothing}
    >
      ${ticks(domain).map(
        (level) =>
          html`<span
            part="tick"
            style=${sideways ? `inset-inline-start: ${scale(level)}%` : `inset-block-start: ${scale(level)}%`}
            >${format(level)}</span
          >`,
      )}
    </div>`
  }

  /**
   * The grid, behind everything, or nothing at all.
   *
   * Across the measured axis, which turns with `orientation`: a rule belongs to
   * the axis the bars are measured on and not the one they are arranged on, so
   * columns get horizontal rules and rows get vertical ones. Getting that
   * backwards draws a grid that divides the categories, which are already
   * divided by being separate bars.
   *
   * Drawn before the baseline, so where a gridline and zero coincide the
   * baseline is what shows: zero is a fact about the data and a gridline is a
   * ruler.
   */
  protected renderGridlines(
    y: (value: number) => number,
    domain: [number, number],
    sideways: boolean,
    count: number,
  ): TemplateResult | typeof nothing {
    if (this.gridlines === undefined) {
      return nothing
    }
    /* Through the middle of each group, which is where the column stands, and
       not on the boundary between two of them, and through the groups whose
       names are drawn, which is every one where every name fits. */
    const slot = 100 / Math.max(count, 1)
    const categories = this.rulesCategory
      ? this.names
          .place(this.sourceRows)
          .filter((one) => one.at < count)
          .map((one) => (one.at + 0.5) * slot)
          .map((at) =>
            sideways
              ? svg`<line part="gridline" x1="0" x2="100" y1=${at} y2=${at} />`
              : svg`<line part="gridline" x1=${at} x2=${at} y1="0" y2="100" />`,
          )
      : []
    const levels = this.rulesValue
      ? ticks(domain).map((level) =>
          sideways
            ? svg`<line part="gridline" x1=${y(level)} x2=${y(level)} y1="0" y2="100" />`
            : svg`<line part="gridline" x1="0" x2="100" y1=${y(level)} y2=${y(level)} />`,
        )
      : []
    return svg`${categories}${levels}`
  }

  /**
   * The slot the pointer is resting in, drawn behind the columns.
   *
   * **The honest version of the fade.** A group under the pointer already sets
   * `data-active` and the stylesheet dims the others, which says which group is
   * meant by making four of five quieter: it reads as the chart losing
   * confidence rather than as one column being pointed at. A band says the same
   * thing by lighting the region the pointer is actually in, and the region is
   * the whole slot, because that is the catchment the pointer resolves against.
   *
   * Both are kept. The fade separates the active group from its neighbors and
   * the band says where the neighborhood is, and on a chart of two categories
   * the fade alone is ambiguous about which half is lit.
   */
  protected renderBand(count: number, sideways: boolean): TemplateResult | typeof nothing {
    const at = this.pointer.at
    if (at < 0 || count === 0) {
      return nothing
    }
    const slot = 100 / count
    return sideways
      ? svg`<rect height=${slot} part="band" width="100" x="0" y=${at * slot} />`
      : svg`<rect height="100" part="band" width=${slot} x=${at * slot} y="0" />`
  }

  /**
   * The category names, as HTML beside the drawing: the names that fit, each
   * in the room `--chart-label-start` and `--chart-label-size` place along the
   * axis, as `LineChart` draws them.
   */
  protected renderLabels(categories: string[]): TemplateResult {
    return html`<div aria-hidden="true" part="labels">
      ${this.names.place(this.sourceRows).map(
        ({ at, size, start }) =>
          html`<span
              part="label"
              style="--chart-label-start: ${start}%; --chart-label-size: ${size}%"
              >${categories[at]}</span
            >`,
      )}
    </div>`
  }

  /** Each series drawn as a line, held against the scale and the axis it was drawn on. */
  private drawnLines = new WeakMap<
    Series,
    {
      columns: number
      path: string
      sideways: boolean
      slot: number
      y: (value: number) => number
    }
  >()

  /**
   * One series drawn as a line across the categories, behind a seam.
   *
   * Through the middle of each slot, which is where the group stands, so a
   * point sits over its own columns rather than over the gap between two of
   * them. The same arithmetic the category gridlines use, and for the same
   * reason: the reading is the thing, the boundary is only where the pointer
   * changes its mind.
   *
   * `data-series` keeps the index the series has among *all* of them, not among
   * the lines, so the color a line takes is the color the legend gives it and
   * moving a column between marks does not repaint the chart.
   */
  protected renderLine(
    one: Series,
    depth: number,
    slot: number,
    y: (value: number) => number,
    sideways: boolean,
  ): TemplateResult {
    /* Each reading at its own row's category, and the line broken where a row
       has none, so a blank is a gap with no line across it. Past four
       readings to a pixel, through the points the pixels show, as a line
       chart's line is. Held, so a render the pointer asks for draws it from
       the path it already has. */
    const columns = Math.round((this.axisPixels() || 0) * (globalThis.devicePixelRatio || 1))
    const held = this.drawnLines.get(one)
    const path =
      held &&
      held.y === y &&
      held.slot === slot &&
      held.sideways === sideways &&
      held.columns === columns
        ? held.path
        : unbroken(one)
            .map((run) => {
              const points = columnPoints(
                run.map((point): Point => [point.at * slot + slot / 2, y(point.value)]),
                columns,
                PLOT_WIDTH,
              )
              return linePath(
                sideways ? points.map(([across, along]): Point => [along, across]) : points,
                'straight',
              )
            })
            .join('')
    this.drawnLines.set(one, { columns, path, sideways, slot, y })
    /* Straight between the category centers, and no `curve` property to change
       it. A bar chart's other axis is categorical: there is nothing between
       Gateway and Billing, so a curve through them draws values at positions
       that do not exist and bulges past the readings on the way. `LineChart`
       offers the choice because its axis is continuous and the shape between
       two readings is a claim somebody may legitimately want to make. */
    return svg`<path
      d=${path}
      data-series=${seriesIndex(depth)}
      part="line"
      style="--chart-series: var(--chart-series-${seriesIndex(depth)})"
    />`
  }

  /**
   * What a pointer resting on a reading shows.
   *
   * A seam over `drawTooltip`, which holds the markup every chart shares. The
   * usual reason to override is arrangement: every cell of the row is already
   * there, including the columns nothing was plotted from.
   */
  protected renderTooltip(): TemplateResult | typeof nothing {
    const at = this.pointer.at
    const series = this.series
    if (at < 0 || series.length === 0) {
      return drawTooltip(
        this.sourceRows,
        at,
        this.tag('tooltip'),
        undefined,
        undefined,
        this.pointer,
      )
    }
    /* Off the far end of the tallest bar in the group, so the box never covers
       the columns it is describing. Horizontal bars grow away from their names,
       so the far end is along x: rightward, or leftward where the drawing is
       mirrored, and the bubble goes on that side because a placement is
       physical. */
    const shown = series.filter((one) => this.showsSeries(one.name))
    const reached = shown
      .map((one) => this.slotsOf(one, this.readings)[at]?.value)
      .filter((one): one is number => one !== undefined)
    /* Stacked, the far end is the top of the stack. */
    const values = this.stacked ? stackEnds([reached]) : reached
    const sideways = this.orientation === 'horizontal'
    const { reach: scale } = this.frameOf(series, this.readings)
    const ends = (values.length > 0 ? values : [0]).map((one) => scale(one))
    const far = sideways ? Math.max(...ends) : Math.min(...ends)
    const slot = 100 / this.readings
    const across = at * slot + slot / 2
    return drawTooltip(
      this.sourceRows,
      at,
      this.tag('tooltip'),
      {
        placement: sideways ? (this.pointer.mirrored ? 'left' : 'right') : 'top',
        x: sideways ? `${far}%` : `${across}%`,
        y: sideways ? `${across}%` : `${far}%`,
      },
      (cell) => this.seriesOf(cell),
      this.pointer,
    )
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-bar-chart': HelixHeadlessBarChart
  }
}
