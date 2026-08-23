import {
  customElement,
  drawTooltip,
  extent,
  HelixElement,
  linear,
  linePath,
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
 * The properties below are written by this component and read by whoever draws
 * it. A consumer sets none of them: they carry a number this element computed
 * and CSS cannot, which is what lets a stylesheet on this tier draw the thing
 * without measuring anything itself.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Column Chart, Categorical Chart
 * @documentation https://helix.fusion.dev/components/bar-chart
 *
 * @csspart axis - One scale's numbers, drawn only when `secondary` splits them.
 * @csspart band - The slot the pointer is resting in.
 * @csspart bar - One column.
 * @csspart bar-wash-end - The far stop of a bar's gradient, where one is used.
 * @csspart bar-wash-start - The stop of a bar's gradient at its base.
 * @csspart baseline - The rule the columns stand on.
 * @cssproperty --chart-bar-wash - The gradient a bar would take, named per bar so the
 *   styled tier can point `fill` at it. Drawn whatever the treatment and used only where
 *   `wash="gradient"` asks for it.
 * @csspart gridline - One rule across the plot, under `gridlines`.
 * @csspart group - One category's columns, together.
 * @csspart label - One category's name.
 * @csspart labels - The row of category names.
 * @csspart line - A series drawn as a line rather than as columns, under `lines`.
 * @csspart mark - The invisible point the tooltip is anchored to.
 * @csspart plot - The drawing.
 * @csspart svg - The drawing surface the bars and lines sit on.
 * @csspart tick - One number on an axis.
 * @csspart tooltip - The bubble, forwarded from `Tooltip`.
 * @csspart tooltip-anchor - The `Tooltip` element itself.
 * @csspart tooltip-cell - One column's name and value inside the tooltip.
 * @csspart tooltip-label - The reading's own name inside the tooltip.
 * @csspart tooltip-name - A column's name inside the tooltip.
 * @csspart tooltip-value - A column's value inside the tooltip.
 *
 * @cssproperty --bar-chart-axis - The colour of a single-series axis, taken from that series.
 * @cssproperty --bar-chart-secondary - The colour of the secondary axis when one series owns it. It resolves a `--helix-color-series-*` token, so on the headless tier alone it names something that is not there. #138.
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

  /**
   * Which series are drawn as a line instead of as columns, by name.
   *
   * Space separated, matched against the column headings the table gives, so a
   * chart says `lines="Margin"` rather than counting columns. Names because
   * they are what the table already carries and what the legend already shows:
   * an index is a fourth place the column order is written down and the first
   * one to go stale when somebody moves a column.
   *
   * **A combination chart is one scale, and that is the honest half of it.**
   * Both marks are measured against the same domain, so a line here says
   * something comparable to the columns beside it. The usual reason to reach
   * for a combination chart is the other thing, a count against a percentage on
   * a second axis, and that is deliberately not this: two scales on one frame
   * let the author put any two shapes in any relation by choosing the ranges,
   * and the reader has no way to see it happening.
   *
   * A line among columns still measures from zero, because the columns do and
   * they share the axis. That is the trade for comparability, and it is why
   * this is a bar chart that can carry a line rather than a line chart that can
   * carry columns.
   */
  @property()
  lines?: string

  /**
   * Which series are measured against a scale of their own, by name.
   *
   * Space separated and matched the way `lines` is, against the column headings
   * the table gives. Opt in: absent, every series shares one domain, which is
   * what makes a chart comparable and is the right default.
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
   * is on which, so both scales are labelled the moment this is set. An
   * unlabelled second axis is the deceptive case rather than the tidy one.
   *
   * The grid stays on the primary axis, since a rule measured against two
   * scales at once is a rule that means nothing. The tooltip is unaffected: it
   * has always shown every column's own number, which is the reader's way out
   * of any scale question the picture raises.
   */
  @property({ reflect: true })
  secondary?: string

  /** The series names on the second scale, lowercased and trimmed. */
  private get scaled(): Set<string> {
    return new Set(
      (this.secondary ?? '')
        .split(/\s+/)
        .map((name) => name.trim().toLowerCase())
        .filter(Boolean),
    )
  }

  /** The series names drawn as a line, lowercased and trimmed for matching. */
  private get lined(): Set<string> {
    return new Set(
      (this.lines ?? '')
        .split(/\s+/)
        .map((name) => name.trim().toLowerCase())
        .filter(Boolean),
    )
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
    const scaled = this.scaled
    const own = (one: Series): boolean => scaled.has(one.name.trim().toLowerCase())
    /* Two extents where a series asked for its own, and the primary is taken
       over the series that did *not*: measuring the primary over everything
       would stretch it to hold numbers no column is drawn against, which is the
       one thing splitting the axes was meant to stop. Empty on either side
       falls back to the whole set, so `secondary` naming a column that is not
       there leaves a chart rather than a blank. */
    const values = series.flatMap((one) => one.points.map((point) => point.value))
    const on = (which: (one: Series) => boolean): number[] => {
      const found = series.filter(which).flatMap((one) => one.points.map((point) => point.value))
      return found.length > 0 ? found : values.length > 0 ? values : [0]
    }
    const [low, high] = extent(scaled.size === 0 ? on(() => true) : on((one) => !own(one)))
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
    const range: [number, number] = this.direction === 'horizontal' ? [0, HEIGHT] : [HEIGHT, 0]
    const y = linear(domain, range)
    const floor = y(0)

    const sideways = this.direction === 'horizontal'
    const [second, top] = extent(scaled.size > 0 ? on(own) : [0])
    const other: [number, number] = [Math.min(0, second), Math.max(0, top)]
    const z = scaled.size > 0 ? linear(other, range) : undefined

    const named = this.named

    /* Widest number on either scale, in characters, so the axis column is the
       size of its own contents.
     *
     * The ticks are absolutely positioned, which is what puts each one on the
     * level it names and also what stops any of them contributing a width: an
     * axis of six numbers laid out that way is an empty box. The count is known
     * here and unknowable to a selector, so it is written as a length and the
       stylesheet reads it. */
    const widest =
      z === undefined
        ? 0
        : Math.max(
            ...[...ticks(domain), ...ticks(other)].map((level) => level.toLocaleString().length),
          )

    /* The second axis wears its series' colour when exactly one series is on it,
       which is the case worth helping and the only one a single colour can
       describe honestly: with two sharing it, painting the axis either of their
       colours says it belongs to that one.
     *
       **Written onto the axis and not onto the plot**, which is where it went
       first and where it did nothing. The axis is the plot's sibling now that it
       is a column of the host grid, and a custom property inherits down and
       never sideways. Measured: both axes came out the neutral, which is the
       same mistake `--donut-chart-stroke` made one component over. */
    const lone = series.filter(own)
    const tint =
      lone.length === 1 && lone[0] !== undefined
        ? `--bar-chart-secondary: var(--chart-series-${seriesIndex(series.indexOf(lone[0]))})`
        : undefined

    return html`${
      z === undefined ? nothing : this.renderAxis(y, domain, 'primary', sideways, widest)
    }${this.renderPlot(series, categories, y, domain, floor, named, z)}${
      z === undefined ? nothing : this.renderAxis(z, other, 'secondary', sideways, widest, tint)
    }${this.renderLabels(categories)}`
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
    z?: (value: number) => number,
  ): TemplateResult {
    const sideways = this.direction === 'horizontal'
    const slot = 100 / categories.length
    /* Split first, because the columns share the slot between themselves and a
       line takes none of it. Sized by every series instead, a chart of two
       columns and one line drew both columns two thirds as wide and left a
       third of every slot empty, for a mark that is not in the slot at all. */
    const lined = this.lined
    /* Kept with the index it has among *all* the series, because a column needs
       two different numbers and they stopped being the same the moment one
       series could be a line. `depth` is its place in the slot, so the columns
       stand shoulder to shoulder with no gap where a line was; `tone` is its
       place in the palette, so it keeps the colour the legend gives it.
     *
       Passing the first for both is what the first version did, and it was
       visible: with `Target` drawn as a line, `Forecast` moved up into its slot
       *and* into its colour, so a chart of four series painted three columns in
       the first three colours and the line in the third one as well. */
    const scaled = this.scaled
    const own = (one: Series): boolean => scaled.has(one.name.trim().toLowerCase())
    /* The scale a series is measured against, resolved once per series rather
       than per point. `z` is absent unless `secondary` named something, so the
       ordinary chart takes exactly the path it took before this existed. */
    const against = (one: Series): ((value: number) => number) =>
      z !== undefined && own(one) ? z : y
    const columns = series
      .map((one, index) => ({ one, tone: index }))
      .filter(({ one }) => !lined.has(one.name.trim().toLowerCase()))
    /* **The stride is what the columns share and the thickness is what they
       draw**, and the difference between them is why they had none. Back to
       back, two columns meet on one coordinate and each one's edge is the
       other's: an outlined chart showed a single line between them rather than
       two, and a bar looked as though it were missing a side. A gap is also just
       the right way to draw a group, which is why the split stays whether
       anything is outlined or not.

       Centred in the stride rather than flush against it, so the gap between two
       columns is the same size everywhere and the group sits where it did. One
       series has no neighbour to be separated from and keeps the full stride. */
    const stride = (slot * 0.72) / Math.max(columns.length, 1)
    const gap = columns.length > 1 ? stride * 0.08 : 0
    const thickness = stride - gap

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
    const bar = (
      value: number,
      index: number,
      depth: number,
      tone: number,
      scale: (value: number) => number,
    ): TemplateResult => {
      const at = scale(value)
      const along = Math.min(floor, at)
      const size = Math.abs(floor - at)
      const across = index * slot + slot * 0.14 + depth * stride + gap / 2
      return sideways
        ? svg`<rect
            data-series=${seriesIndex(tone)}
            height=${thickness}
            style="--chart-series: var(--chart-series-${seriesIndex(tone)}); --chart-bar-wash: url(#helix-bar-wash-${seriesIndex(tone)})"
            part="bar"
            width=${size}
            x=${along}
            y=${across}
          />`
        : svg`<rect
            data-series=${seriesIndex(tone)}
            height=${size}
            style="--chart-series: var(--chart-series-${seriesIndex(tone)}); --chart-bar-wash: url(#helix-bar-wash-${seriesIndex(tone)})"
            part="bar"
            width=${thickness}
            x=${across}
            y=${along}
          />`
    }

    return html`<div
      aria-hidden="true"
      id="helix-chart-plot"
      part="plot"
      title=${named || nothing}
    >
      <svg part="svg"
        preserveAspectRatio="none"
        viewBox="0 0 100 ${HEIGHT}"
        xmlns="http://www.w3.org/2000/svg"
      >
        ${
          /* **One gradient per series, rendered whether or not anything points
             at it.** A `<defs>` entry draws nothing on its own, and this tier's
             business is elements while which fill a bar takes is the styled
             tier's: `wash="gradient"` there switches `fill` to
             `--chart-bar-wash` and this is what it would find.

             Coloured through the series property rather than an attribute, so
             the stops read a token this tier never names. The id resolves
             within the shadow root, so two charts on a page carrying the same
             ids stay independent, which the sparkline measured before relying
             on it. */
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
          </defs>`
        }
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
              ${columns.map(({ one, tone }, depth) => bar(one.points[index]?.value ?? 0, index, depth, tone, against(one)))}
            </g>`,
        )}
        ${
          /* After the groups, so a line is never drawn under the columns it is
             meant to be read against. Outside them too: a group is one
             category and a line crosses all of them, so it belongs to the plot
             rather than to any one slot. */
          series.map((one) =>
            lined.has(one.name.trim().toLowerCase())
              ? this.renderLine(one, series.indexOf(one), slot, against(one), sideways)
              : nothing,
          )
        }
      </svg>
      ${this.renderTooltip()}
    </div>`
  }

  /**
   * The numbers along one scale, drawn only where there are two of them.
   *
   * **A chart with one scale renders no axis, on purpose.** Columns measured
   * against each other need no numbers to be compared, and a row of them beside
   * a small chart is furniture that makes the drawing smaller for no reading a
   * reader was going to do. With two scales that argument inverts: a reader
   * cannot tell there are two, cannot tell which series is on which, and cannot
   * recover either from the picture. So this appears with `secondary` and never
   * without it.
   *
   * **Beside the plot and not inside it**, which is the second thing this got
   * wrong. Inside, the numbers are drawn over the drawing, and a horizontal
   * chart shows it immediately: its value axis runs along the bottom, which is
   * where the last row of bars is. The vertical case has the same fault and
   * enough slack to hide it. The plot is also the pointer's catchment and the
   * tooltip's containing block, both measured from its box, so padding it to
   * make room would move every reading half an axis to the right.
   *
   * A column of the host grid instead, which the stylesheet grows only when
   * `secondary` is set. That is what the property reflects for.
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
            >${level.toLocaleString()}</span
          >`,
      )}
    </div>`
  }

  /*
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
   * One series drawn as a line across the categories, behind a seam.
   *
   * Through the middle of each slot, which is where the group stands, so a
   * point sits over its own columns rather than over the gap between two of
   * them. The same arithmetic the category gridlines use, and for the same
   * reason: the reading is the thing, the boundary is only where the pointer
   * changes its mind.
   *
   * `data-series` keeps the index the series has among *all* of them, not among
   * the lines, so the colour a line takes is the colour the legend gives it and
   * moving a column between marks does not repaint the chart.
   */
  protected renderLine(
    one: Series,
    depth: number,
    slot: number,
    y: (value: number) => number,
    sideways: boolean,
  ): TemplateResult {
    const points = one.points.map((point, index): [number, number] => {
      const across = index * slot + slot / 2
      const along = y(point.value)
      return sideways ? [along, across] : [across, along]
    })
    /* Straight between the category centres, and no `curve` property to change
       it. A bar chart's other axis is categorical: there is nothing between
       Gateway and Billing, so a curve through them draws values at positions
       that do not exist and bulges past the readings on the way. `LineChart`
       offers the choice because its axis is continuous and the shape between
       two readings is a claim somebody may legitimately want to make. */
    return svg`<path
      d=${linePath(points, 'straight')}
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
