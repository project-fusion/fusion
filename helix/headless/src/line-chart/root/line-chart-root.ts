import {
  type Curve,
  customElement,
  drawTooltip,
  extent,
  HelixElement,
  linear,
  linePath,
  MixinChartSource,
  type Point,
  type Series,
  seriesIndex,
  ticks,
} from '@helix-io/core'
import { html, nothing, svg, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import '../../tooltip/index.js'

/** The drawing's own coordinates. */
const WIDTH = 100
const HEIGHT = 100

/**
 * @summary A series over time as a line, read from a table.
 *
 * @description
 * The chart for a shape rather than for a quantity, which is what decides the
 * one thing a bar chart is not allowed to do.
 *
 * **It measures from its own range and not from zero, deliberately.** `BarChart`
 * refuses that switch because a bar's length *is* its value, so a baseline
 * anywhere else makes the lengths proportional to nothing. A line claims no
 * such thing: it says where the readings went, and forcing zero into the range
 * of a series that moves between 980 and 1020 flattens the entire shape into a
 * rule across the top of the box. The two rules are opposite because the two
 * charts answer opposite questions, and `zero` is here for the case where the
 * distance from nothing is the point.
 *
 * **One scale across every series**, the same as the bar chart, because two
 * series drawn to different scales are two charts sharing a picture.
 *
 * **The labels are HTML beside the drawing rather than `<text>` inside it**, for
 * the reason `BarChart` records: an `<svg>` that fills its box scales its type
 * with everything else, the same `font-size` arriving at 10px in a narrow chart
 * and 43px in a wide one, and there is no non-scaling-font to answer it the way
 * `vector-effect` answers strokes.
 *
 * The table is the accessible representation and this drawing is `aria-hidden`.
 * A reader who wants the numbers gets the numbers, not a described picture.
 *
 * @since 0.1.0
 * @status experimental
 * @category charts
 * @aliases Time Series, Trend Chart, Multi-line Chart
 * @documentation https://helix.fusion.dev/components/line-chart
 *
 * @csspart area - The wash under one line, where `area` is set.
 * @csspart band - The slot the pointer is resting in.
 * @csspart baseline - The rule at zero, where zero is inside the range.
 * @csspart gridline - One rule across the plot, under `gridlines`.
 * @csspart guide - A rule down the reading a pointer is resting on.
 * @csspart label - One reading's name.
 * @csspart labels - The row of reading names.
 * @csspart line - One series.
 * @csspart mark - The invisible point the tooltip is anchored to.
 * @csspart plot - The drawing.
 * @csspart svg - The drawing surface the lines and areas sit on.
 * @csspart tooltip - The bubble, forwarded from `Tooltip`.
 * @csspart tooltip-anchor - The `Tooltip` element itself.
 * @csspart tooltip-cell - One column's name and value inside the tooltip.
 * @csspart tooltip-label - The reading's own name inside the tooltip.
 * @csspart tooltip-name - A column's name inside the tooltip.
 * @csspart tooltip-value - A column's value inside the tooltip.
 */
@customElement('helix-headless-line-chart')
export class HelixHeadlessLineChart extends MixinChartSource(HelixElement) {
  /**
   * Whether a wash is drawn under each line.
   *
   * Absent is lines alone, which is what suits more than one series: washes
   * stack and the lower ones are read through the upper. One series over a
   * ground it should feel like a quantity against is the case for this.
   */
  @property({ reflect: true, type: Boolean })
  area = false

  /**
   * How the line gets from one reading to the next.
   *
   * **`smooth` is the resting curve.** *Changed 21 Aug 2026, reversing the
   * argument this comment used to make.* Joining the readings claims nothing in
   * between, which is true and is why `straight` still exists: a straight
   * segment asserts nothing about the values between two readings, and a curve
   * invents them. What settles it the other way is that the invention is
   * bounded. The interpolation is monotone cubic, so it never leaves the band
   * the data sets and never introduces a peak or a trough the series does not
   * have, and within that bound the smoothed line is the easier one to follow
   * across a long series. `straight` becomes the deliberate claim.
   *
   * **Still absent rather than defaulted on the property**, because a
   * reflecting property with a default writes its attribute onto every host
   * anybody renders, including the ones nobody configured.
   * `line-chart-root.ssr.spec.ts` asserts the host carries only what the
   * consumer wrote, and caught that the first time. The default therefore lives
   * where the path is built, as `curve ?? 'smooth'`.
   *
   * `step` claims the opposite of both, that a reading holds until the next.
   */
  @property({ reflect: true })
  curve?: Curve

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
   * through each reading, which is what lets a point be traced down to its
   * label across a wide chart. `both` draws both.
   *
   * **A bare `gridlines` means `value`**, and so does anything unrecognised.
   * Written out, the attribute a consumer reaches for first should be the grid
   * they meant, and a typo should fall back to the useful half rather than to
   * nothing at all: an unrecognised value that draws no rules is
   * indistinguishable from the attribute being absent, which is the one thing
   * a reader cannot debug.
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
   * Whether zero is forced into the range.
   *
   * Absent measures from the data's own extent, which is what a line is for.
   * Set it where the distance from nothing is the point rather than the shape,
   * and accept that a series which never approaches zero becomes a flat rule
   * near the top of the box.
   */
  @property({ reflect: true, type: Boolean })
  zero = false

  /** The domain every series is drawn against, which the tooltip also needs. */
  private range(series: Series[]): [number, number] {
    const values = series.flatMap((one) => one.points.map((point) => point.value))
    const [low, high] = extent(values.length > 0 ? values : [0])
    return this.zero ? [Math.min(0, low), Math.max(0, high)] : [low, high]
  }

  protected override render(): TemplateResult {
    const series = this.series
    const readings = series[0]?.points.map((point) => point.label) ?? []
    if (readings.length === 0) {
      return html`<div id="helix-chart-plot" part="plot"></div>`
    }

    const domain = this.range(series)
    const y = linear(domain, [HEIGHT, 0])
    /* **A reading sits in the middle of its own slot, not at the edge of the
       box**, which is what makes the names underneath line up with it.
     *
     * Spanning 0 to 100 is the obvious version and is what this did first. The
     * labels are a grid of equal columns, the same row the bar chart uses, so
     * each name is centered in its share of the width while the readings sat at
     * the gridlines between those shares: measured, the first name centered at a
     * twelfth of the width with its point at zero. Every label was off by half
     * a slot and the error grew toward the middle.
     *
     * Insetting by half a slot also means a line chart and a bar chart drawn
     * from the same table stack, which is the arrangement anybody comparing a
     * total to its parts wants. The cost is that the line stops short of both
     * edges, and that is the smaller thing to give up. */
    const slot = WIDTH / readings.length
    const x = linear([0, Math.max(readings.length - 1, 1)], [slot / 2, WIDTH - slot / 2])

    const named = this.named

    return html`${this.renderPlot(series, x, y, domain, named)} ${this.renderLabels(readings)}`
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
    named: string,
  ): TemplateResult {
    /* Drawn only where zero is inside the range. A rule at the foot of a chart
       whose lowest reading is 980 is not the zero line, it is the bottom of the
       box wearing the zero line's clothes, and a reader takes it for one. */
    const floor = domain[0] <= 0 && domain[1] >= 0 ? y(0) : undefined

    return html`<div aria-hidden="true" id="helix-chart-plot" part="plot" title=${named || nothing}>
      <svg part="svg"
        preserveAspectRatio="none"
        viewBox="0 0 ${WIDTH} ${HEIGHT}"
        xmlns="http://www.w3.org/2000/svg"
      >
        ${this.renderGridlines(x, y, domain, series[0]?.points.length ?? 0)}
        ${
          floor === undefined
            ? nothing
            : svg`<line part="baseline" x1="0" x2=${WIDTH} y1=${floor} y2=${floor} />`
        }
        ${this.renderBand(series[0]?.points.length ?? 0)}
        ${this.renderGuide(x)}
        ${series.map((one, depth) => this.renderSeries(one, depth, x, y))}
      </svg>
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
       category grid is for. The readings sit at slot centres, so the two are
       half a slot apart and only one of them lands under a point. */
    const down = this.rulesCategory
      ? Array.from(
          { length: count },
          (_, index) =>
            svg`<line part="gridline" x1=${x(index)} x2=${x(index)} y1="0" y2=${HEIGHT} />`,
        )
      : []
    const across = this.rulesValue
      ? ticks(domain).map(
          (level) => svg`<line part="gridline" x1="0" x2=${WIDTH} y1=${y(level)} y2=${y(level)} />`,
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
    const slot = WIDTH / count
    return svg`<rect height=${HEIGHT} part="band" width=${slot} x=${at * slot} y="0" />`
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
    return svg`<line part="guide" x1=${x(at)} x2=${x(at)} y1="0" y2=${HEIGHT} />`
  }

  /** One series, its wash first so the line is drawn over its own fill. */
  protected renderSeries(
    one: Series,
    depth: number,
    x: (value: number) => number,
    y: (value: number) => number,
  ): TemplateResult {
    const points: Point[] = one.points.map((point, index) => [x(index), y(point.value)])
    const path = linePath(points, this.curve ?? 'smooth')
    if (path === '') {
      return html`${nothing}`
    }
    const index = seriesIndex(depth)
    /* Closed along the floor of the box and back, which is what makes it
       fillable: a `<path>` is filled between its own ends, so an open line
       fills the region between the stroke and the straight line joining its
       first point to its last. */
    const first = points[0] as Point
    const last = points.at(-1) as Point
    const wash = `${path}L${last[0]},${HEIGHT}L${first[0]},${HEIGHT}Z`
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
      part="line"
      style="--chart-series: var(--chart-series-${index})"
    />`
  }

  /**
   * The reading names, as HTML beside the drawing rather than inside it.
   *
   * Inside, they would scale with the box, for the reason the class doc gives.
   */
  protected renderLabels(readings: string[]): TemplateResult {
    return html`<div aria-hidden="true" part="labels">
      ${readings.map((one) => html`<span part="label">${one}</span>`)}
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
      return drawTooltip(this.rows, at, this.tag('tooltip'))
    }
    /* Above the topmost series at that reading, so the box never covers the
       line it is describing. `y` counts down in the drawing, so the smallest is
       the highest, and no readings at all would make `Math.min` return
       Infinity. */
    const domain = this.range(series)
    const scale = linear(domain, [HEIGHT, 0])
    const tops = series
      .map((one) => one.points[at]?.value)
      .filter((one): one is number => one !== undefined)
      .map((one) => scale(one))
    const slot = 100 / this.readings
    return drawTooltip(this.rows, at, this.tag('tooltip'), {
      placement: 'top',
      x: `${at * slot + slot / 2}%`,
      y: `${tops.length > 0 ? Math.min(...tops) : 0}%`,
    })
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-line-chart': HelixHeadlessLineChart
  }
}
