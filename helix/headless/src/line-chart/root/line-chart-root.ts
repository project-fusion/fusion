import {
  byRow,
  CategoryAxisController,
  CHART_PLOT,
  type Curve,
  columnPoints,
  commaList,
  customElement,
  drawTooltip,
  drawValueAxis,
  formatNumbers,
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
  type Series,
  type SeriesPoint,
  seriesIndex,
  seriesKey,
  ticks,
  unbroken,
  wordsLocale,
} from '@fusion.dev/helix-core'
import { html, nothing, svg, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import '../../tooltip/index.js'

/** Two decimals, as a line's path is written, which is more than a 100 unit view box can show. */
const round = (value: number): number => Math.round(value * 100) / 100

/**
 * @summary A chart that draws series over time as lines, read from a table.
 *
 * @description
 * A line chart shows the shape of each series: where the readings went.
 *
 * The scale covers the range of the data. Including zero in the range of a
 * series that moves between 980 and 1020 would flatten the line into a rule
 * across the top of the box. `BarChart` always starts at zero, because a bar's
 * length is its value. Set `zero` when the distance from zero is the point.
 *
 * Every series shares one scale, as in the bar chart.
 *
 * `dashed` names the series drawn as a dashed line, such as a forecast or a
 * target beside the readings: `dashed="Forecast"`. Each takes a
 * `line-dashed` part beside `line`.
 *
 * `area` fills each series down to the floor on its own, so the fills overlap.
 * For a total made of parts, use `Area Chart`, which stacks the series so the
 * top edge is the total and each band is a share.
 *
 * The labels are HTML beside the drawing, as in `BarChart`. Text inside an
 * `<svg>` that fills its box scales with the box, so the same `font-size` can
 * render at 10px in a narrow chart and 43px in a wide one.
 *
 * `value-axis` draws the scale's numbers beside the plot, at the levels
 * `gridlines` rules, written in `locale`.
 *
 * The table is the accessible representation, and the drawing is hidden from
 * screen readers, who get the numbers. The `summary` part names the chart, from
 * `label` or the table's caption, and gives each series' latest reading.
 *
 * **The plot is read by key.** It takes focus, named by `label` or the caption.
 * The left and right arrows move from reading to reading, Home and End go to
 * the first and the last, and the up and down arrows move among the series of
 * a reading. The tooltip follows, the `live` part says the reading in words,
 * and Escape puts the tooltip away.
 *
 * **A tap shows the reading under it**, and keeps it until a tap lands
 * elsewhere. `helix-reading-change` says each move of the reading, by pointer,
 * tap or key, and `helix-reading-press` says a reading was clicked, tapped, or
 * pressed with Enter or Space, for a page that opens what a reading stands for.
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
 * | Home, End | Moves to the first or the last reading. |
 * | Page Down, Page Up | Moves a tenth of the readings on or back. |
 * | Enter, Space | Presses the reading shown, which sends `helix-reading-press`. |
 * | Escape | Puts the reading and its tooltip away. |
 *
 * @since 0.1.0
 * @status stable
 * @category charts
 * @aliases Time Series, Trend Chart, Multi-line Chart
 * @documentation https://fusion.dev/helix/components/line-chart
 *
 * @slot empty - Content shown in place of the drawing when the table has no readings, such as a link to add the first. Falls back to `empty-text`.
 * @slot loading - Content shown in place of the drawing while `loading` is set and there are no readings yet. Falls back to `loading-text`.
 *
 * @event {HelixReadingChangeEvent} helix-reading-change - The reading shown moved, or was put away: `index` is the row, or `-1` for none, with its `label`, the `series` the keys rest on, and the `pointerType` that moved it.
 * @event {HelixReadingPressEvent} helix-reading-press - A reading was clicked, tapped, or pressed with Enter or Space, with the same detail as `helix-reading-change`.
 *
 * @csspart area - The wash under one line, where `area` is set.
 * @csspart axis - The numbers of the scale beside the plot, under `value-axis`.
 * @csspart band - The band around the reading under the pointer.
 * @csspart baseline - The rule at zero, where zero is inside the range.
 * @csspart empty - The words in place of the drawing when the table has no readings: the `empty` slot, falling back to `empty-text`. Not drawn while the table cannot be read yet, on the server and during hydration.
 * @csspart gridline - One rule across the plot, under `gridlines`.
 * @csspart guide - A rule down the reading a pointer is resting on.
 * @csspart label - One reading's name, placed along the row by `--chart-label-start` and `--chart-label-size` with its text centered. Only the names that fit are drawn, the first and the last always.
 * @csspart labels - The row of reading names, which the names share: lay it out as one grid cell they all stand in.
 * @csspart line - The line for one series.
 * @csspart line-dashed - A `line` whose series `dashed` names. Set alongside `line`.
 * @csspart live - The readout: a polite live region that says the reading the keys moved to. Hide it visually.
 * @csspart loading - The words in place of the drawing while `loading` is set and there are no readings: the `loading` slot, falling back to `loading-text`.
 * @csspart mark - The invisible point the tooltip is anchored to.
 * @csspart marker - The marks on one series' readings under `markers`, as one path with a stroke of no length at each reading: give it a round `stroke-linecap`, a `stroke-width` the size of a mark and `vector-effect: non-scaling-stroke`. Carries its series color as `--chart-series`.
 * @csspart marker-lone - The `marker` path of one series' readings with a blank on either side, which no line reaches and which are marked without `markers`. Set alongside `marker`.
 * @csspart marker-ring - The same marks again under each series' `marker` paths, to stroke a little wider in the page's color, so a mark reads over the line it sits on.
 * @csspart plot - The drawing, which takes focus to be read by key. With nothing to draw, a group named as the chart is, holding the `empty` or `loading` part.
 * @csspart summary - The chart's name and each series' latest reading, written as a sentence for screen readers. Hide it visually.
 * @csspart svg - The drawing surface the lines and areas sit on.
 * @csspart table - The readings as a table, for a screen reader, rendered only where they were drawn from `data`, a page of them at a time past a few hundred. Hide it visually.
 * @csspart table-pages - Which readings a page of the `table` holds, and the buttons that show the previous and the next page, rendered only while it holds a page. Hide it visually.
 * @csspart terminus - The mark on one series' last reading.
 * @csspart tick - One number on the axis, placed with `inset-block-start` at its level.
 * @csspart tooltip-anchor - The `Tooltip` element itself.
 * @csspart tooltip-arrow - The bubble's point, forwarded from `Tooltip`.
 * @csspart tooltip-arrow-bottom - The point while the bubble is below the reading, so on its top edge, beside `tooltip-arrow`.
 * @csspart tooltip-arrow-left - The point while the bubble is left of the reading, so on its right edge, beside `tooltip-arrow`.
 * @csspart tooltip-arrow-right - The point while the bubble is right of the reading, so on its left edge, beside `tooltip-arrow`.
 * @csspart tooltip-arrow-top - The point while the bubble is above the reading, so on its bottom edge, beside `tooltip-arrow`.
 * @csspart tooltip-cell - One column's name and value inside the tooltip.
 * @csspart tooltip-cell-current - The cell the up and down arrows rest on, while they rest there. Set alongside `tooltip-cell`.
 * @csspart tooltip-label - The reading's own name inside the tooltip.
 * @csspart tooltip-name - A column's name inside the tooltip.
 * @csspart tooltip-surface - The bubble, forwarded from `Tooltip`.
 * @csspart tooltip-surface-bottom - The bubble while it is below the reading, beside `tooltip-surface`.
 * @csspart tooltip-surface-left - The bubble while it is left of the reading, beside `tooltip-surface`.
 * @csspart tooltip-surface-right - The bubble while it is right of the reading, beside `tooltip-surface`.
 * @csspart tooltip-surface-top - The bubble while it is above the reading, beside `tooltip-surface`.
 * @csspart tooltip-value - A column's value inside the tooltip.
 *
 * @cssproperty --chart-label-size - How much of the row a reading's name has room for, as a percentage. Written by the component on each `label`.
 * @cssproperty --chart-label-start - Where a reading name's room starts along the row, as a percentage from the inline start. Written by the component on each `label`.
 * @cssproperty --chart-terminus-x - Where a series' last reading sits horizontally, as a percentage. Written by the component.
 * @cssproperty --chart-terminus-y - Where a series' last reading sits vertically, as a percentage. Written by the component.
 * @cssproperty --line-chart-axis - The width of the axis, in `ch`, set from the widest number on it. Written by the component on the axis.
 *
 * @cssstate active - While a reading is shown, under the pointer or the keys, with its tooltip open.
 * @cssstate empty - While the `empty` part stands in the plot.
 * @cssstate loading - While the `loading` part stands in the plot.
 */
@customElement('helix-headless-line-chart')
export class HelixHeadlessLineChart extends MixinChartStatus(MixinChartSource(HelixElement)) {
  protected static override markRules = [MIRROR_RULE]

  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-line-chart': { positionLabel: '{position} von {count}' } })`.
   */
  static words = 'helix-line-chart'

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
   * Draws a wash under each line, down to the floor of the plot. The washes
   * overlap and do not add up, so for parts that make a total, use
   * `Area Chart`, which stacks them.
   *
   * Absent is lines alone, which is what suits more than one series: washes
   * overlap and the lower ones are read through the upper. One series over a
   * ground it should feel like a quantity against is the case for this.
   */
  @property({ reflect: true, type: Boolean })
  area = false

  /**
   * How the line gets from one reading to the next.
   *
   * **`smooth` is the resting curve.** A curve invents the values between two
   * readings, which is why `straight` still exists, but the invention is
   * bounded: the interpolation is monotone cubic, so it never leaves the band
   * the data sets and never introduces a peak or a trough the series does not
   * have. Within that bound the smoothed line is the easier one to follow
   * across a long series, and `straight` becomes the deliberate claim.
   *
   * **Absent rather than defaulted on the property**, because a reflecting
   * property with a default writes its attribute onto every host anybody
   * renders, including the ones nobody configured.
   * `line-chart-root.ssr.spec.ts` asserts the host carries only what the
   * consumer wrote. The default therefore lives where the path is built, as
   * `curve ?? 'smooth'`.
   *
   * `step` claims the opposite of both, that a reading holds until the next.
   *
   * **`AreaChart` rests at `straight` and is not disagreeing.** A line claims a
   * position and a stacked band claims an amount: a curve fitted through one
   * sum can pass under the curve fitted through the sum beneath it, so a
   * smoothed stack can draw a part as less than nothing. There is no such edge
   * here, which is what lets a line take the reading aid.
   */
  @property({ reflect: true })
  curve?: Curve

  /**
   * The series drawn as a dashed line, by their headings, separated by
   * commas: `dashed="Forecast, Target"`.
   *
   * For a series that is not a reading, such as a forecast or a goal, drawn
   * beside the ones that are. Each takes a `line-dashed` part beside `line`,
   * which a stylesheet draws dashed. Absent, every line is solid.
   */
  @property()
  dashed = ''

  /**
   * Which rules are drawn across the plot, if any.
   *
   * Absent draws none, which is the honest default rather than a timid one: a
   * chart in a card and a chart beside a figure are read as a shape, and a grid
   * over one is furniture around a drawing nobody is measuring.
   *
   * `value` rules the axis the readings are *measured* on, at the levels
   * `ticks` picks, which are round numbers anchored to the number line rather
   * than to where the data starts, so two charts over different ranges rule at
   * the same levels. `category` rules the axis they are *arranged* on, one
   * through each reading whose name is drawn, which is what lets a point be
   * traced down to its label across a wide chart. `both` draws both.
   *
   * **A bare `gridlines` means `value`**, and so does anything unrecognized.
   * The attribute a consumer reaches for first should be the grid they meant,
   * and a typo should fall back to the useful half rather than to nothing at
   * all: an unrecognized value that draws no rules is indistinguishable from
   * the attribute being absent, which is the one thing a reader cannot debug.
   *
   * Furniture rather than data, so the rules are inside the `aria-hidden` plot
   * and reach no reader through the table.
   */
  @property()
  gridlines?: 'both' | 'category' | 'value'

  /** Whether the levels are ruled, which is every value but `category`. */
  protected get rulesValue(): boolean {
    return this.gridlines !== undefined && this.gridlines !== 'category'
  }

  /** Whether each reading is ruled, which only two values ask for. */
  protected get rulesCategory(): boolean {
    return this.gridlines === 'both' || this.gridlines === 'category'
  }

  /**
   * Draws a mark on every reading, the `marker` part, so a reader sees where
   * the readings are, as well as the line between them.
   *
   * Absent draws none, except on a reading with a blank on either side: it
   * has no line to be part of, so it takes a mark, the `marker` part with
   * `marker-lone` beside it, or it would not be drawn at all.
   */
  @property({ reflect: true, type: Boolean })
  markers = false

  /**
   * The shape of the mark on each series' last reading.
   *
   * Absent is a dot, and absent rather than defaulted because a reflecting
   * property with a default writes its attribute onto a host the consumer
   * rendered, which React reports as a hydration mismatch.
   *
   * **One per series, in a column at the far edge**, because every series here
   * shares an x-axis and therefore ends at the same reading. That column is the
   * useful thing: it is where a reader looks for "and what is it now", which is
   * the question a sparkline's single mark answers too.
   *
   * `none` lets the lines stop on their own, which suits a chart read for its
   * shape rather than for where it finished. `square` is the same mark with its
   * corners, for a drawing whose neighbors are square, the columns of a table
   * beside it for instance. `ring` lets the ground through, for a chart drawn
   * over something busy. `triangle` points along the axis and reads as "and
   * onward" rather than as a second claim about the data.
   *
   * The shapes come from one shared sheet, the same one `Sparkline` takes, so
   * the set is identical wherever one appears. **Which is why every value is
   * named here.** `Sparkline` shipped `square` implemented, drawn, asserted and
   * undocumented until the cohort before this one; this family reads the same
   * four out of the same sheet and had left two of them unwritten, so the
   * finding arrived twice. A shared vocabulary wants naming at each door into
   * it, because a reader arrives at one door and not at the set.
   *
   * `ring` is the one that asks something of the drawing. It leaves a hole and a
   * line ends at the reading, which is the hole's center, so the `<svg>` is
   * masked with one disc per series and every stroke stops at its own ring's
   * inner edge. `mask-composite: intersect` is what makes N holes out of N
   * layers; a single `mask-image` would only ever cut the last one.
   */
  @property({ reflect: true })
  terminus?: 'none' | 'ring' | 'square' | 'triangle'

  /**
   * Draws the scale's numbers beside the plot, the `axis` part, at the levels
   * `gridlines` rules, so a reading can be measured off the drawing as well
   * as read from the tooltip.
   *
   * Absent draws none: a line read for its shape needs no numbers beside it,
   * and the tooltip and the table hold every reading.
   */
  @property({ attribute: 'value-axis', reflect: true, type: Boolean })
  valueAxis = false

  /** The domain last worked out, held while the series, the hidden ones and `zero` are the same. */
  private ranged: { domain: [number, number]; key: string; series: Series[] } | undefined

  /** The domain every series is drawn against, which the tooltip also needs. */
  private range(series: Series[]): [number, number] {
    /* Over the series drawn, so hiding one from a legend fits the scale to
       the rest, which is what hiding a series in a chart is for. */
    const key = `${this.zero} ${series.map((one) => (this.showsSeries(one.name) ? 1 : 0)).join('')}`
    if (this.ranged?.series === series && this.ranged.key === key) {
      return this.ranged.domain
    }
    /* A walk over the readings, which builds no array of every value the
       way handing them to `extent` would. */
    let low = Number.POSITIVE_INFINITY
    let high = Number.NEGATIVE_INFINITY
    for (const one of series) {
      if (!this.showsSeries(one.name)) {
        continue
      }
      for (const point of one.points) {
        low = Math.min(low, point.value)
        high = Math.max(high, point.value)
      }
    }
    const [floor, top] = low <= high ? [low, high] : [0, 0]
    const domain: [number, number] = this.zero
      ? [Math.min(0, floor), Math.max(0, top)]
      : [floor, top]
    this.ranged = { domain, key, series }
    return domain
  }

  /**
   * The two scales, held while the domain and the count are the same, so a
   * render the pointer asks for draws with the scales the paths were made
   * with and every path is held.
   */
  private scales:
    | {
        count: number
        domain: [number, number]
        x: (value: number) => number
        y: (value: number) => number
      }
    | undefined

  private scalesOf(
    domain: [number, number],
    count: number,
  ): { x: (value: number) => number; y: (value: number) => number } {
    const held = this.scales
    if (
      held &&
      held.count === count &&
      held.domain[0] === domain[0] &&
      held.domain[1] === domain[1]
    ) {
      return held
    }
    const y = linear(domain, [PLOT_HEIGHT, 0])
    /* **A reading sits in the middle of its own slot, not at the edge of the
       box**, which is what makes the names underneath line up with it.
     *
     * Spanning 0 to 100 is the obvious version and is wrong. Each name is
     * centered in its reading's share of the width, as the bar chart's are,
     * while the readings would sit at the boundaries between those shares:
     * measured, the first name centered at a twelfth of the width with its
     * point at zero. Every label is off by half a slot and the error grows
     * toward the middle.
     *
     * Insetting by half a slot also means a line chart and a bar chart drawn
     * from the same table stack, which is the arrangement anybody comparing a
     * total to its parts wants. The cost is that the line stops short of both
     * edges, and that is the smaller thing to give up. */
    const slot = PLOT_WIDTH / count
    const x = linear([0, Math.max(count - 1, 1)], [slot / 2, PLOT_WIDTH - slot / 2])
    this.scales = { count, domain, x, y }
    return this.scales
  }

  /**
   * Each series' runs and each run's path, held against the scales and the
   * curve they were drawn with.
   *
   * **A render the pointer asks for redraws nothing.** Every move of the
   * pointer across the plot is a render, and a path through every reading
   * built again on each one is work a move does not change. A series is a new
   * object whenever the table is read again, so an edit draws afresh.
   */
  private drawn = new WeakMap<
    Series,
    {
      columns: number
      curve: Curve
      marks?: { lone: string; markers: boolean; marks: string }
      runs: Array<{ path: string; points: Point[] }>
      x: (value: number) => number
      y: (value: number) => number
    }
  >()

  /** A series' unbroken runs as paths, from the held drawing where it still holds. */
  private runsOf(
    one: Series,
    x: (value: number) => number,
    y: (value: number) => number,
  ): Array<{ path: string; points: Point[] }> {
    const curve = this.curve ?? 'smooth'
    /* The device's pixels across the plot, which a path of more readings than
       that is drawn at. Before the plot is measured, the window's: that render
       is replaced before it is painted, and building every reading's segment
       for it doubled the first frame of 100,000 readings. */
    const across = this.names.measured || globalThis.innerWidth || 0
    const columns = Math.round(across * (globalThis.devicePixelRatio || 1))
    const held = this.drawn.get(one)
    if (held && held.x === x && held.y === y && held.curve === curve && held.columns === columns) {
      return held.runs
    }
    const runs = this.unbrokenOf(one)
      .map((run) => {
        const points: Point[] = run.map((point) => [x(point.at), y(point.value)])
        return { path: linePath(columnPoints(points, columns, PLOT_WIDTH), curve), points }
      })
      .filter((run) => run.path !== '')
    this.drawn.set(one, { columns, curve, runs, x, y })
    return runs
  }

  /** Each series' unbroken runs, held by series, which the paths and the marks both walk. */
  private unbrokens = new WeakMap<Series, SeriesPoint[][]>()

  private unbrokenOf(one: Series): SeriesPoint[][] {
    let held = this.unbrokens.get(one)
    if (held === undefined) {
      held = unbroken(one)
      this.unbrokens.set(one, held)
    }
    return held
  }

  /** Each series laid out one slot per row, held for the tooltip, which reads one slot a move. */
  private slots = new WeakMap<Series, ReturnType<typeof byRow>>()

  private slotsOf(one: Series): ReturnType<typeof byRow> {
    let held = this.slots.get(one)
    if (held === undefined || held.length !== this.readings) {
      held = byRow(one, this.readings)
      this.slots.set(one, held)
    }
    return held
  }

  /**
   * Measures the axis and says which reading names fit on it, which are the
   * names drawn and the readings `category` gridlines rule.
   */
  private readonly names = new CategoryAxisController(this)

  /**
   * Whether the range always includes zero.
   *
   * Absent measures from the data's own extent, which is what a line is for.
   * Set it where the distance from nothing is the point rather than the shape,
   * and accept that a series which never approaches zero becomes a flat rule
   * near the top of the box.
   */
  @property({ reflect: true, type: Boolean })
  zero = false

  /**
   * Where each series ends, as percentages of the drawing's own box.
   *
   * Percentages rather than user units, for the reason the mark is a `<span>`
   * rather than a `<circle>`: `preserveAspectRatio="none"` stretches the
   * coordinate space, so a length in there means two different things depending
   * on how wide the consumer made the chart. The host's box stretches nothing.
   */
  private ends(
    series: Series[],
    x: (value: number) => number,
    y: (value: number) => number,
  ): Array<{ index: number; x: number; y: number }> {
    return series.flatMap((one, depth) => {
      const last = one.points.at(-1)
      if (!this.showsSeries(one.name)) {
        return []
      }
      /* A single reading is a point rather than a line, and a mark on the end of
         something with no length is a mark on nothing. */
      if (!last || one.points.length < 2) {
        return []
      }
      return [
        {
          index: seriesIndex(depth),
          x: (x(last.at) / PLOT_WIDTH) * 100,
          y: (y(last.value) / PLOT_HEIGHT) * 100,
        },
      ]
    })
  }

  protected override render(): TemplateResult {
    const series = this.series
    /* Every row is a reading's place, whether or not each series has a number
       in it, which is also how the pointer and the tooltip count them. */
    const readings = series.length === 0 ? [] : this.sourceRows.map((row) => row.label)
    if (readings.length === 0) {
      return this.renderEmpty()
    }

    const domain = this.range(series)
    const { x, y } = this.scalesOf(domain, readings.length)

    return html`${this.valueAxis ? this.renderAxis(y, domain) : nothing}${this.renderPlot(series, x, y, domain)} ${this.renderLabels(readings)}${this.renderSummary(series)}${this.renderTable()}`
  }

  /**
   * The scale's numbers beside the plot, under `value-axis`, written in the
   * chart's locale. A seam, so a subclass can write the numbers its own way,
   * such as a currency.
   */
  protected renderAxis(y: (value: number) => number, domain: [number, number]): TemplateResult {
    return drawValueAxis(
      domain,
      (value) => (y(value) / PLOT_HEIGHT) * 100,
      formatNumbers(wordsLocale(this)),
      (widest) => `--line-chart-axis: ${widest}ch`,
    )
  }

  /**
   * What a reader who cannot see the lines is told: the chart's name and the
   * latest reading of each series.
   *
   * The latest, because where a series ended is the question a line over time
   * is asked first, which is what `AreaChart` gives too. Each series' own last
   * reading, so a series with a blank in the last row still says where it was.
   * Written the way the table writes it, such as `$128k` for `128000`. A
   * series a legend hid is not drawn and is not said.
   */
  protected renderSummary(series: Series[]): TemplateResult {
    const rows = this.sourceRows
    const columns = this.plottedColumns
    const latest = series.flatMap((one, depth) => {
      const last = one.points.at(-1)
      if (last === undefined || !this.showsSeries(one.name)) {
        return []
      }
      const text = rows[last.at]?.cells[columns[depth] ?? -1]?.text ?? String(last.value)
      return [{ label: last.label, reading: `${one.name} ${text}` }]
    })
    /* One label where every series ended on the same row, which is the usual
       table, and each its own where they did not. The readings are listed as
       the locale lists, which in English is with commas. */
    const shared = latest.every((one) => one.label === latest[0]?.label)
    const listed = new Intl.ListFormat(wordsLocale(this), { style: 'short', type: 'unit' })
    const body = shared
      ? `${latest[0]?.label ?? ''}: ${listed.format(latest.map((one) => one.reading))}`
      : latest.map((one) => `${one.label}: ${one.reading}`).join('; ')
    const named = this.named ? `${this.named}, ` : ''
    return html`<p id="helix-chart-summary" part="summary">${named}${body}.</p>`
  }

  /**
   * The lines themselves, behind a seam the styled tier can move.
   *
   * `aria-hidden`, because the table it was read from is the readable version
   * and a screen reader hearing both hears the same numbers twice.
   */
  protected renderPlot(
    series: Series[],
    x: (value: number) => number,
    y: (value: number) => number,
    domain: [number, number],
  ): TemplateResult {
    /* Drawn only where zero is inside the range. A rule at the foot of a chart
       whose lowest reading is 980 is not the zero line, it is the bottom of the
       box wearing the zero line's clothes, and a reader takes it for one. */
    const floor = domain[0] <= 0 && domain[1] >= 0 ? y(0) : undefined

    const ends = this.terminus === 'none' ? [] : this.ends(series, x, y)
    /* Built here rather than in the sheet, because a stylesheet cannot count
       series and a mask needs one layer per hole. Each layer is transparent
       inside its own ring and opaque everywhere else, so intersecting them
       removes the union of the holes and nothing besides. */
    const holes =
      this.terminus === 'ring' && ends.length > 0
        ? ends
            .map(
              (end) =>
                `radial-gradient(circle at ${end.x}% ${end.y}%, #0000 calc(var(--_chart-terminus-inner) - 0.5px), #000 var(--_chart-terminus-inner))`,
            )
            .join(', ')
        : undefined

    return html`<div
      aria-describedby=${this.named ? 'helix-chart-summary' : nothing}
      aria-label=${this.named || nothing}
      aria-labelledby=${this.named ? nothing : 'helix-chart-summary'}
      id=${CHART_PLOT}
      part="plot"
      role="application"
      tabindex="0"
      style=${holes ? `--_line-chart-holes: ${holes}` : nothing}
    >
      <svg part="svg"
        aria-hidden="true"
        data-mirror
        preserveAspectRatio="none"
        viewBox="0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}"
        xmlns="http://www.w3.org/2000/svg"
      >
        ${this.renderGridlines(x, y, domain, this.readings)}
        ${
          floor === undefined
            ? nothing
            : svg`<line part="baseline" x1="0" x2=${PLOT_WIDTH} y1=${floor} y2=${floor} />`
        }
        ${this.renderBand(this.readings)}
        ${this.renderGuide(x)}
        ${series.map((one, depth) => this.renderSeries(one, depth, x, y))}
        ${this.renderMarkers(series, x, y)}
      </svg>
      ${this.renderTermini(ends)}
      ${this.renderTooltip()}
    </div>`
  }

  /**
   * The grid, behind everything, or nothing at all.
   *
   * Drawn first so a series is never cut by a rule, and before the baseline so
   * that where the two coincide the baseline wins: zero is a fact about the
   * data and a gridline is a ruler, and the reader should see the fact.
   */
  protected renderGridlines(
    x: (value: number) => number,
    y: (value: number) => number,
    domain: [number, number],
    count: number,
  ): TemplateResult | typeof nothing {
    if (this.gridlines === undefined) {
      return nothing
    }
    /* Through each reading rather than between them. A rule on the boundary
       divides two catchments, which is a fact about the pointer; a rule on the
       reading is the line a reader traces down to the label, which is what a
       category grid is for. The readings sit at slot centers, so the two are
       half a slot apart and only one of them lands under a point.
     *
       Through the readings whose names are drawn, which is every one where
       every name fits: a rule is traced down to a name, and a rule through
       each of 10,000 readings is a gray block. */
    const down = this.rulesCategory
      ? this.names
          .place(this.sourceRows)
          .filter((one) => one.at < count)
          .map(
            ({ at }) =>
              svg`<line part="gridline" x1=${x(at)} x2=${x(at)} y1="0" y2=${PLOT_HEIGHT} />`,
          )
      : []
    const across = this.rulesValue
      ? ticks(domain).map(
          (level) =>
            svg`<line part="gridline" x1="0" x2=${PLOT_WIDTH} y1=${y(level)} y2=${y(level)} />`,
        )
      : []
    return svg`${down}${across}`
  }

  /**
   * The slot the pointer is resting in, drawn behind the drawing.
   *
   * A band and not a second rule. The guide says exactly where the reading is
   * and the band says which share of the width belongs to it, which is what a
   * reader is actually pointing at: the catchment is a slot wide, so a pointer
   * a few pixels off the line is still asking about that reading, and without
   * the band nothing on screen says so.
   *
   * The same slot arithmetic the pointer controller resolves with, so the lit
   * region and the region that answers are the same region by construction
   * rather than by two files agreeing.
   */
  protected renderBand(count: number): TemplateResult | typeof nothing {
    const at = this.pointer.at
    if (at < 0 || count === 0) {
      return nothing
    }
    const slot = PLOT_WIDTH / count
    return svg`<rect height=${PLOT_HEIGHT} part="band" width=${slot} x=${at * slot} y="0" />`
  }

  /**
   * A rule down the reading the tooltip is about.
   *
   * Without it the tooltip is a box of numbers floating over a drawing, and a
   * reader has to match its heading against the row of names to find out which
   * column it means. The rule is the whole of what connects the two, and it
   * matters most on a line, where there is no marker under the pointer to
   * stand in for one.
   *
   * Drawn before the series so a line is never cut by it.
   */
  protected renderGuide(x: (value: number) => number): TemplateResult | typeof nothing {
    const at = this.pointer.at
    if (at < 0) {
      return nothing
    }
    return svg`<line part="guide" x1=${x(at)} x2=${x(at)} y1="0" y2=${PLOT_HEIGHT} />`
  }

  /**
   * The marks, as elements beside the drawing rather than shapes inside it.
   *
   * A seam of its own, so a tier or a consumer's subclass can draw them
   * differently without reimplementing the plot.
   */
  protected renderTermini(
    ends: Array<{ index: number; x: number; y: number }>,
  ): TemplateResult | typeof nothing {
    if (ends.length === 0) {
      return nothing
    }
    return html`${ends.map(
      (end) =>
        html`<span
          aria-hidden="true"
          part="terminus"
          style=${`--chart-series: var(--chart-series-${end.index}); --chart-terminus-x: ${end.x}%; --chart-terminus-y: ${end.y}%`}
        ></span>`,
    )}`
  }

  /**
   * The marks on the readings: every one under `markers`, and otherwise only
   * a reading no line reaches, which has a blank on either side.
   *
   * **One path per series for all of its marks**, each mark a stroke of no
   * length, which a round cap draws as a dot. A mark per element cost an
   * element per reading, so `markers` on 10,000 readings built 10,000 of them.
   * `vector-effect: non-scaling-stroke` measures the stroke in the page's
   * pixels, so the dot is round in a drawing `preserveAspectRatio="none"`
   * stretches, and the drawing's own mirror places it on a right-to-left page.
   *
   * Under each series' marks, the same marks again as the `marker-ring` part,
   * which a stylesheet strokes wider in the page's color, so a mark reads over
   * the line it sits on. After every line, so no line crosses a mark.
   */
  protected renderMarkers(
    series: Series[],
    x: (value: number) => number,
    y: (value: number) => number,
  ): TemplateResult | typeof nothing {
    const drawn = series.flatMap((one, depth) => {
      if (!this.showsSeries(one.name)) {
        return []
      }
      const { lone, marks } = this.marksOf(one, x, y)
      return lone === '' && marks === '' ? [] : [{ index: seriesIndex(depth), lone, marks }]
    })
    if (drawn.length === 0) {
      return nothing
    }
    return svg`${drawn.map(
      ({ index, lone, marks }) =>
        svg`<path
          d=${marks + lone}
          data-series=${index}
          part="marker-ring"
        />${
          marks === ''
            ? nothing
            : svg`<path
                d=${marks}
                data-series=${index}
                part="marker"
                style="--chart-series: var(--chart-series-${index})"
              />`
        }${
          lone === ''
            ? nothing
            : svg`<path
                d=${lone}
                data-series=${index}
                part="marker marker-lone"
                style="--chart-series: var(--chart-series-${index})"
              />`
        }`,
    )}`
  }

  /**
   * A series' marks as path data, a stroke of no length at each: the runs of
   * more than one reading under `markers`, and the runs of one always. Held
   * with the series' paths.
   */
  private marksOf(
    one: Series,
    x: (value: number) => number,
    y: (value: number) => number,
  ): { lone: string; marks: string } {
    const runs = this.runsOf(one, x, y)
    const held = this.drawn.get(one)
    const kept = held?.marks
    if (kept && kept.markers === this.markers) {
      return kept
    }
    const dot = (point: Point): string => `M${point[0]},${point[1]}h0`
    let marks = ''
    let lone = ''
    for (const run of this.unbrokenOf(one)) {
      const points = run.map((point): Point => [round(x(point.at)), round(y(point.value))])
      if (points.length === 1) {
        lone += dot(points[0] as Point)
      } else if (this.markers) {
        marks += points.map(dot).join('')
      }
    }
    const found = { lone, markers: this.markers, marks }
    if (held && runs === held.runs) {
      held.marks = found
    }
    return found
  }

  /** Whether `dashed` names this series, matched as a heading is. */
  private dashes(name: string): boolean {
    const key = seriesKey(name)
    return this.dashed !== '' && commaList(this.dashed).some((one) => seriesKey(one) === key)
  }

  /**
   * One series, its wash first so the line is drawn over its own fill.
   *
   * Each reading sits at its own row, and the line breaks where a row has no
   * reading: a line drawn across a blank claims a value nobody measured.
   */
  protected renderSeries(
    one: Series,
    depth: number,
    x: (value: number) => number,
    y: (value: number) => number,
  ): TemplateResult {
    /* A series a legend hid keeps its palette slot and draws nothing. */
    if (!this.showsSeries(one.name)) {
      return html`${nothing}`
    }
    const runs = this.runsOf(one, x, y)
    if (runs.length === 0) {
      return html`${nothing}`
    }
    const index = seriesIndex(depth)
    const path = runs.map((run) => run.path).join('')
    /* Closed along the floor of the box and back, which is what makes it
       fillable: a `<path>` is filled between its own ends, so an open line
       fills the region between the stroke and the straight line joining its
       first point to its last. One closed shape per run, so a gap is not
       washed either. */
    const wash = runs
      .map((run) => {
        const first = run.points[0] as Point
        const last = run.points.at(-1) as Point
        return `${run.path}L${last[0]},${PLOT_HEIGHT}L${first[0]},${PLOT_HEIGHT}Z`
      })
      .join('')
    return svg`${
      this.area
        ? svg`<path
            d=${wash}
            data-series=${index}
            part="area"
            style="--chart-series: var(--chart-series-${index})"
          />`
        : nothing
    }<path
      d=${path}
      data-series=${index}
      fill="none"
      part="line${this.dashes(one.name) ? ' line-dashed' : ''}"
      style="--chart-series: var(--chart-series-${index})"
    />`
  }

  /**
   * The reading names, as HTML beside the drawing rather than inside it.
   *
   * Inside, they would scale with the box, for the reason the class doc gives.
   *
   * The names that fit, each in a room `--chart-label-start` and
   * `--chart-label-size` place along the axis: every name where every name
   * fits, and otherwise a regular share of them with the first and the last
   * kept. See `placeLabels`.
   */
  protected renderLabels(readings: string[]): TemplateResult {
    return html`<div aria-hidden="true" part="labels">
      ${this.names.place(this.sourceRows).map(
        ({ at, size, start }) =>
          html`<span
              part="label"
              style="--chart-label-start: ${start}%; --chart-label-size: ${size}%"
              >${readings[at]}</span
            >`,
      )}
    </div>`
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
    /* Above the topmost series at that reading, so the box never covers the
       line it is describing. `y` counts down in the drawing, so the smallest is
       the highest, and no readings at all would make `Math.min` return
       Infinity. */
    const { y: scale } = this.scalesOf(this.range(series), this.readings)
    const tops = series
      .filter((one) => this.showsSeries(one.name))
      .map((one) => this.slotsOf(one)[at]?.value)
      .filter((one): one is number => one !== undefined)
      .map((one) => scale(one))
    const slot = 100 / this.readings
    return drawTooltip(
      this.sourceRows,
      at,
      this.tag('tooltip'),
      {
        placement: 'top',
        x: `${at * slot + slot / 2}%`,
        y: `${tops.length > 0 ? Math.min(...tops) : 0}%`,
      },
      (cell) => this.seriesOf(cell),
      this.pointer,
    )
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-line-chart': HelixHeadlessLineChart
  }
}
