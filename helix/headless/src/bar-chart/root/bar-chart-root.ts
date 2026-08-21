import {
  customElement,
  drawTooltip,
  extent,
  HelixElement,
  linear,
  MixinChartSource,
  type Series,
  seriesIndex,
  ticks,
} from '@helix-io/core'
import { html, nothing, type PropertyValues, svg, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import '../../tooltip/index.js'

/** The drawing's own coordinates. Height only: the width is the element's. */
const HEIGHT = 100

/**
 * @summary Categories as columns, read from a table.
 *
 * @description
 * The chart most often asked for and the one most often drawn wrongly, so two
 * decisions are made here rather than left to a consumer.
 *
 * **It measures from zero and there is no property to change that.** A bar's
 * length *is* its value, so a baseline anywhere else makes the lengths
 * proportional to nothing. That is the oldest misleading chart there is, and a
 * design system that ships the switch has shipped the mistake. A reader who
 * wants the differences between values rather than the values should be drawing
 * a line, which claims only a shape.
 *
 * **The labels are HTML beside the drawing rather than `<text>` inside it.** An
 * `<svg>` that fills its box scales everything in it, including type: the same
 * `font-size` comes out at 10px in a narrow chart and 43px in a wide one, and
 * there is no non-scaling-font to answer it the way `vector-effect` answers
 * strokes. So the columns are drawn and the words are written around them.
 *
 * The table is the accessible representation and this drawing is `aria-hidden`.
 * A reader who wants the numbers gets the numbers, not a described picture of
 * them.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Column Chart, Categorical Chart
 * @documentation https://helix.fusion.dev/components/bar-chart
 *
 * @csspart bar - One column.
 * @csspart band - The slot the pointer is resting in.
 * @csspart baseline - The rule the columns stand on.
 * @csspart gridline - One rule across the plot, under `gridlines`.
 * @csspart group - One category's columns, together.
 * @csspart label - One category's name.
 * @csspart labels - The row of category names.
 * @csspart plot - The drawing.
 * @csspart tooltip - The bubble, forwarded from `Tooltip`.
 * @csspart tooltip-anchor - The `Tooltip` element itself.
 * @csspart mark - The invisible point the tooltip is anchored to.
 * @csspart tooltip-cell - One column's name and value inside the tooltip.
 * @csspart tooltip-label - The reading's own name inside the tooltip.
 * @csspart tooltip-name - A column's name inside the tooltip.
 * @csspart tooltip-value - A column's value inside the tooltip.
 */
@customElement('helix-base-bar-chart')
export class HelixBaseBarChart extends MixinChartSource(HelixElement) {
  /**
   * Whether the categories run down the side rather than along the bottom.
   *
   * Absent is columns. `horizontal` is the one to reach for when the category
   * names are words rather than dates: a row of long names either overlaps or
   * turns on its side, and neither is as readable as putting them down the left
   * where they read normally.
   */
  @property({ reflect: true })
  direction?: 'horizontal'

  /**
   * Which rules are drawn across the plot, if any.
   *
   * Absent draws none. `value` rules the axis the columns are *measured* on,
   * `category` rules the axis they are *arranged* on with one through each
   * group, and `both` draws both. Which of those is horizontal turns with
   * `direction`, because a rule belongs to an axis and not to a screen edge.
   *
   * **A bare `gridlines` means `value`**, and so does anything unrecognised: an
   * unrecognised value that draws nothing is indistinguishable from the
   * attribute being absent, which is the one thing a reader cannot debug.
   *
   * `category` is the quieter half of this on a bar chart and is here for
   * completeness rather than because it is usually right: columns already
   * divide the categories by being separate columns, and a rule through each
   * one is a second statement of the same fact. It earns its place on a chart
   * of many thin bars, where the eye has stopped counting.
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

  /** Whether each category is ruled, which only two values ask for. */
  protected get rulesCategory(): boolean {
    return this.gridlines === 'both' || this.gridlines === 'category'
  }

  /**
   * Tells the pointer which way the categories run.
   *
   * In `willUpdate` because `direction` is a property a consumer can change at
   * any time, and the controller resolves a reading from whichever axis it was
   * last told about: set once at connect, a chart turned sideways after that
   * would go on reading x and answer with the same row wherever the pointer
   * went. That is the bug this pair was written for, one step later.
   *
   * `willUpdate` and not `updated`, because SSR calls the first and not the
   * second, and a value the server and the client disagree about is worse than
   * one neither has.
   */
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed)
    this.pointer.axis = this.direction === 'horizontal' ? 'block' : 'inline'
  }

  protected override render(): TemplateResult {
    const series = this.series
    const categories = series[0]?.points.map((point) => point.label) ?? []
    if (categories.length === 0) {
      return html`<div id="helix-chart-plot" part="plot"></div>`
    }

    /* Zero at both ends, so a series that goes negative gets a baseline inside
       the box and its columns hang below it. `extent` over every series at once
       rather than per series, because two series drawn to different scales are
       two charts sharing a picture. */
    const values = series.flatMap((one) => one.points.map((point) => point.value))
    const [low, high] = extent(values.length > 0 ? values : [0])
    /* **The range is inverted for columns and not for bars**, which is the
       whole of what makes the two directions different arithmetic rather than
       one drawing turned on its side. SVG counts down from the top, so a column
       growing upward needs `[HEIGHT, 0]`; a bar growing rightward is already
       going the way x counts, so it takes `[0, HEIGHT]`.
     *
     * Reusing the inverted scale for both was the first version. It put the
       longest bar at x=0 and every shorter one hard against the right edge,
       growing away from the baseline instead of out of it. */
    const domain: [number, number] = [Math.min(0, low), Math.max(0, high)]
    const y =
      this.direction === 'horizontal' ? linear(domain, [0, HEIGHT]) : linear(domain, [HEIGHT, 0])
    const floor = y(0)

    const named = this.named

    return html`${this.renderPlot(series, categories, y, domain, floor, named)}
      ${this.renderLabels(categories)}`
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
    named: string,
  ): TemplateResult {
    const sideways = this.direction === 'horizontal'
    const slot = 100 / categories.length
    const thickness = (slot * 0.72) / Math.max(series.length, 1)

    /* **The geometry is computed for the axis it is drawn on, not rotated onto
       it.** The first version turned the whole plot with `rotate: 90deg`, which
       is the shorter CSS and does not work: a rotation is about the element's
       own centre, so the drawing left its grid cell entirely and the labels,
       which are a separate row, stayed where they were. What it produced was
       one column floating beside a list of names.
     *
     * Swapping the two axes here costs one branch and keeps every other fact
     * about the chart the same. `value` runs along x when the bars are
     * sideways and along y otherwise; `category` takes the other one. */
    const bar = (value: number, index: number, depth: number): TemplateResult => {
      const at = y(value)
      const along = Math.min(floor, at)
      const size = Math.abs(floor - at)
      const across = index * slot + slot * 0.14 + depth * thickness
      return sideways
        ? svg`<rect
            data-series=${seriesIndex(depth)}
            height=${thickness}
            part="bar"
            width=${size}
            x=${along}
            y=${across}
          />`
        : svg`<rect
            data-series=${seriesIndex(depth)}
            height=${size}
            part="bar"
            width=${thickness}
            x=${across}
            y=${along}
          />`
    }

    return html`<div aria-hidden="true" id="helix-chart-plot" part="plot" title=${named || nothing}>
      <svg
        preserveAspectRatio="none"
        viewBox="0 0 100 ${HEIGHT}"
        xmlns="http://www.w3.org/2000/svg"
      >
        ${this.renderGridlines(y, domain, sideways, categories.length)}
        ${
          sideways
            ? svg`<line part="baseline" x1=${floor} x2=${floor} y1="0" y2="100" />`
            : svg`<line part="baseline" x1="0" x2="100" y1=${floor} y2=${floor} />`
        }
        ${this.renderBand(categories.length, sideways)}
        ${categories.map(
          (_, index) =>
            /* The group the tooltip is about says so, and the stylesheet fades
               the rest. A tooltip over a chart of five categories otherwise
               makes a reader match its heading against the row of names to find
               out which columns it means. */
            svg`<g data-active=${this.pointer.at === index ? '' : nothing} part="group">
              ${series.map((one, depth) => bar(one.points[index]?.value ?? 0, index, depth))}
            </g>`,
        )}
      </svg>
      ${this.renderTooltip()}
    </div>`
  }

  /**
   * The category names, as HTML beside the drawing rather than inside it.
   *
   * Inside, they would scale with the box: an `<svg>` that fills its container
   * scales its type along with everything else, and there is no non-scaling
   * equivalent for a font the way `vector-effect` is one for a stroke.
   */
  /**
   * The grid, behind everything, or nothing at all.
   *
   * Across the measured axis, which turns with `direction`: a rule belongs to
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
       not on the boundary between two of them. */
    const slot = 100 / Math.max(count, 1)
    const categories = this.rulesCategory
      ? Array.from({ length: count }, (_, index) => (index + 0.5) * slot).map((at) =>
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
   * Both are kept. The fade separates the active group from its neighbours and
   * the band says where the neighbourhood is, and on a chart of two categories
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

  protected renderLabels(categories: string[]): TemplateResult {
    return html`<div aria-hidden="true" part="labels">
      ${categories.map((one) => html`<span part="label">${one}</span>`)}
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
      return drawTooltip(this.rows, at)
    }
    /* Off the far end of the tallest bar in the group, so the box never covers
       the columns it is describing. Horizontal bars grow rightward, so the far
       end is along x and the arrow hangs off the box's start edge. */
    const values = series.map((one) => one.points[at]?.value ?? 0)
    const all = series.flatMap((one) => one.points.map((point) => point.value))
    const [low, high] = extent(all.length > 0 ? all : [0])
    const domain: [number, number] = [Math.min(0, low), Math.max(0, high)]
    const sideways = this.direction === 'horizontal'
    const scale = sideways ? linear(domain, [0, HEIGHT]) : linear(domain, [HEIGHT, 0])
    const ends = values.map((one) => scale(one))
    const far = sideways ? Math.max(...ends) : Math.min(...ends)
    const slot = 100 / this.readings
    const across = at * slot + slot / 2
    return drawTooltip(this.rows, at, {
      placement: sideways ? 'right' : 'top',
      x: sideways ? `${far}%` : `${across}%`,
      y: sideways ? `${across}%` : `${far}%`,
    })
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-bar-chart': HelixBaseBarChart
  }
}
