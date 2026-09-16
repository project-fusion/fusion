import {
  CHART_PLOT,
  type Curve,
  customElement,
  drawTooltip,
  formatNumbers,
  HelixElement,
  linear,
  linePath,
  MixinChartSource,
  type Point,
  type Row,
  seriesIndex,
  ticks,
} from '@fusion.dev/helix-core'
import { html, nothing, svg, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import '../../tooltip/index.js'

/** The drawing's own coordinates. */
const WIDTH = 100
const HEIGHT = 100

const percent = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0, style: 'percent' })

/** The table as parts of a total: which columns, what each holds, and the running sums. */
export interface AreaStack {
  /** The table's columns that hold numbers, by their place among its cells. */
  columns: number[]
  /** Each column's running sum at each reading, the top edge of its band. */
  layers: number[][]
  /** Each column's heading. */
  names: string[]
  /** Every reading's total. */
  totals: number[]
  /** Each column's own reading, not yet summed. */
  values: number[][]
}

/**
 * @summary How a total is made up over time, as bands stacked on one another.
 *
 * @description
 * The chart for a composition: every column of the table is a part, the parts
 * sum to the whole at each reading, and the top edge is that whole. What a line
 * chart of the same table cannot show is the share, which here is the
 * thickness of a band.
 *
 * **Not `Line Chart` with `area`.** That washes each series from the floor on
 * its own, so the series overlap; this adds them. Reach for `Line Chart` when
 * the question is how each series moved, and for this when it is how the whole
 * is made up.
 *
 * **It measures from zero, always**, which is `BarChart`'s rule and for the same
 * reason: a band's thickness *is* its value, so a range that starts anywhere
 * else draws every part in proportion to nothing. `LineChart` measures from its
 * own range because a line claims a position; a band claims an amount.
 *
 * **Straight between readings unless asked otherwise.** A band's top edge is a
 * sum, and a curve fitted through one sum can pass under the curve fitted
 * through the sum beneath it, so a smoothed stack can draw a part as less than
 * nothing between two readings. Straight segments between ordered points stay
 * ordered. `curve="smooth"` is there for a stack that is read as a shape.
 *
 * **`share` draws each reading as a hundred percent**, so the bands are the
 * parts' shares and the top edge is flat. It answers "which part grew" where
 * the default answers "did the whole grow".
 *
 * **What a reader without the picture is told is the total and the share**, not
 * every band in turn. The table beside the chart already reads out every
 * number; what the drawing adds is the composition, so the summary says the
 * latest reading's total and each part's share of it. The drawing itself is
 * `aria-hidden`.
 *
 * Every numeric column is a part. A table that carries its own total column
 * would count it twice, so leave it out of the table the chart reads.
 * A negative reading is drawn as none: a part of a whole cannot be less than
 * nothing, and a band that folded under its neighbor would say it was.
 *
 * @since 0.1.0
 * @status experimental
 * @category charts
 * @aliases Stacked Area Chart, Composition Chart, Stream Chart
 * @documentation https://helix.fusion.dev/components/area-chart
 *
 * @csspart area - One part's band.
 * @csspart baseline - The rule at zero, which is the floor of the drawing.
 * @csspart gridline - One rule across the plot, under `gridlines`.
 * @csspart guide - A rule down the reading a pointer is resting on.
 * @csspart label - One reading's name.
 * @csspart labels - The row of reading names.
 * @csspart line - The top edge of one part's band.
 * @csspart mark - The invisible point the tooltip is anchored to.
 * @csspart plot - The drawing.
 * @csspart summary - The total and the shares at the latest reading, for a reader who cannot see the bands.
 * @csspart svg - The drawing surface the bands sit on.
 * @csspart tooltip - The bubble, forwarded from `Tooltip`.
 * @csspart tooltip-anchor - The `Tooltip` element itself.
 * @csspart tooltip-arrow - The bubble's point, forwarded from `Tooltip`.
 * @csspart tooltip-arrow-bottom - The point while the bubble is below the reading, so on its top edge, beside `tooltip-arrow`.
 * @csspart tooltip-arrow-left - The point while the bubble is left of the reading, so on its right edge, beside `tooltip-arrow`.
 * @csspart tooltip-arrow-right - The point while the bubble is right of the reading, so on its left edge, beside `tooltip-arrow`.
 * @csspart tooltip-arrow-top - The point while the bubble is above the reading, so on its bottom edge, beside `tooltip-arrow`.
 * @csspart tooltip-bottom - The bubble while it is below the reading, beside `tooltip`.
 * @csspart tooltip-cell - One column's name and value inside the tooltip.
 * @csspart tooltip-label - The reading's own name inside the tooltip.
 * @csspart tooltip-left - The bubble while it is left of the reading, beside `tooltip`.
 * @csspart tooltip-name - A column's name inside the tooltip.
 * @csspart tooltip-right - The bubble while it is right of the reading, beside `tooltip`.
 * @csspart tooltip-top - The bubble while it is above the reading, beside `tooltip`.
 * @csspart tooltip-value - A column's value inside the tooltip.
 */
@customElement('helix-headless-area-chart')
export class HelixHeadlessAreaChart extends MixinChartSource(HelixElement) {
  /**
   * How a band's edge gets from one reading to the next.
   *
   * Absent is `straight`, for the reason the class doc gives, and absent rather
   * than defaulted because a reflecting property with a default writes its
   * attribute onto every host, including the ones nobody configured.
   */
  @property({ reflect: true })
  curve?: Curve

  /**
   * Which rules are drawn across the plot, if any.
   *
   * The same three values `LineChart` takes, with the same fallback: a bare
   * `gridlines`, or anything unrecognized, rules the levels. Drawn over the bands
   * rather than under them, because the bands are opaque and a rule under one is
   * a rule nobody sees.
   */
  @property()
  gridlines?: 'both' | 'category' | 'value'

  /**
   * Whether each reading is drawn as a hundred percent.
   *
   * Absent stacks the amounts, so the top edge is the total. Set, every reading
   * fills the height and the bands are shares of it.
   */
  @property({ reflect: true, type: Boolean })
  share = false

  /**
   * What to call the sum of the parts, in the tooltip and the summary.
   */
  @property({ attribute: 'total-label' })
  totalLabel = 'Total'

  private warnedAboutNegatives = false

  /** Whether the levels are ruled, which is every value but `category`. */
  protected get rulesValue(): boolean {
    return this.gridlines !== undefined && this.gridlines !== 'category'
  }

  /** Whether each reading is ruled, which only two values ask for. */
  protected get rulesCategory(): boolean {
    return this.gridlines === 'both' || this.gridlines === 'category'
  }

  /**
   * The table as parts of a total.
   *
   * Read from the rows rather than from `series`, because `series` drops a
   * column's empty cells and so numbers each column's readings on its own: a
   * blank in one column would slide every reading after it one place left, and
   * a sum across columns would then add different months together. A blank is
   * none of that part, which is what a blank in a breakdown means.
   */
  protected get stack(): AreaStack {
    const rows = this.sourceRows
    const width = Math.max(0, ...rows.map((row) => row.cells.length))
    const columns = Array.from({ length: width }, (_, column) => column).filter((column) =>
      rows.some((row) => row.cells[column]?.value !== undefined),
    )
    const values = columns.map((column) =>
      rows.map((row) => {
        const value = row.cells[column]?.value ?? 0
        if (value < 0) {
          this.warnNegative()
        }
        return Math.max(0, value)
      }),
    )
    const totals = rows.map((_, index) =>
      values.reduce((sum, column) => sum + (column[index] ?? 0), 0),
    )
    const drawn = this.share
      ? values.map((column) =>
          column.map((value, index) => {
            const total = totals[index] ?? 0
            return total > 0 ? value / total : 0
          }),
        )
      : values
    const layers: number[][] = []
    let running = rows.map(() => 0)
    for (const column of drawn) {
      running = running.map((sum, index) => sum + (column[index] ?? 0))
      layers.push(running)
    }
    return {
      columns,
      layers,
      names: columns.map(
        (column) => rows.find((row) => row.cells[column])?.cells[column]?.name ?? '',
      ),
      totals,
      values,
    }
  }

  /**
   * Says once that a reading was below zero, and what was drawn instead.
   *
   * Once per element, and in a browser only: a server render warning per
   * request is one nobody can act on.
   */
  private warnNegative(): void {
    if (this.warnedAboutNegatives || typeof window === 'undefined') {
      return
    }
    this.warnedAboutNegatives = true
    console.warn(
      `<${this.localName}> read a negative number and drew it as none. Its bands are parts of a ` +
        'total, and a part cannot be less than nothing: a band drawn below its neighbor would say ' +
        'the part took some of the one beneath it away. A series that crosses zero is a line, so ' +
        'reach for `helix-line-chart`.',
    )
  }

  protected override render(): TemplateResult {
    const rows = this.sourceRows
    const stack = this.stack
    if (rows.length === 0 || stack.columns.length === 0) {
      return html`<div id=${CHART_PLOT} part="plot"></div>`
    }
    const top = this.share ? 1 : Math.max(0, ...stack.totals)
    const domain: [number, number] = [0, top > 0 ? top : 1]
    const y = linear(domain, [HEIGHT, 0])
    /* In the middle of each reading's slot, for the reason `LineChart` gives:
       the names underneath are a row of equal columns, and a reading at the
       edge of the box sits half a slot away from its own name. */
    const slot = WIDTH / rows.length
    const x = linear([0, Math.max(rows.length - 1, 1)], [slot / 2, WIDTH - slot / 2])
    return html`${this.renderPlot(stack, rows.length, x, y, domain)}
      ${this.renderLabels(rows.map((row) => row.label))} ${this.renderSummary(stack, rows)}`
  }

  /**
   * The bands, behind a seam the styled tier can move.
   *
   * **Each band is drawn as everything beneath its top edge, the widest first.**
   * The next one down then covers the lower part of it, so what shows of each is
   * the strip between its edge and the edge below. Drawing each band as its own
   * closed strip would need the edge below traced backwards, and a curve traced
   * backwards is not guaranteed to be the same curve: the two would part by a
   * hairline and the page would show through between every pair.
   */
  protected renderPlot(
    stack: AreaStack,
    count: number,
    x: (value: number) => number,
    y: (value: number) => number,
    domain: [number, number],
  ): TemplateResult {
    const order = stack.layers.map((_, depth) => depth).reverse()
    return html`<div aria-hidden="true" id=${CHART_PLOT} part="plot">
      <svg part="svg"
        data-mirror
        preserveAspectRatio="none"
        viewBox="0 0 ${WIDTH} ${HEIGHT}"
        xmlns="http://www.w3.org/2000/svg"
      >
        ${order.map((depth) => this.renderLayer(stack.layers[depth] ?? [], depth, x, y))}
        ${this.renderGridlines(x, y, domain, count)}
        <line part="baseline" x1="0" x2=${WIDTH} y1=${HEIGHT} y2=${HEIGHT} />
        ${this.renderGuide(x)}
      </svg>
      ${this.renderTooltip(stack, y)}
    </div>`
  }

  /** One band: everything under its top edge, and the edge itself. */
  protected renderLayer(
    layer: number[],
    depth: number,
    x: (value: number) => number,
    y: (value: number) => number,
  ): TemplateResult | typeof nothing {
    const points: Point[] = layer.map((value, index) => [x(index), y(value)])
    const path = linePath(points, this.curve ?? 'straight')
    if (path === '') {
      return nothing
    }
    const index = seriesIndex(depth)
    const first = points[0] as Point
    const last = points.at(-1) as Point
    const wash = `${path}L${last[0]},${HEIGHT}L${first[0]},${HEIGHT}Z`
    return svg`<path
        d=${wash}
        data-series=${index}
        part="area"
        style="--chart-series: var(--chart-series-${index})"
      /><path
        d=${path}
        data-series=${index}
        fill="none"
        part="line"
        style="--chart-series: var(--chart-series-${index})"
      />`
  }

  /** The grid, or nothing, at the levels `ticks` picks and through each reading. */
  protected renderGridlines(
    x: (value: number) => number,
    y: (value: number) => number,
    domain: [number, number],
    count: number,
  ): TemplateResult | typeof nothing {
    if (this.gridlines === undefined) {
      return nothing
    }
    const down = this.rulesCategory
      ? Array.from(
          { length: count },
          (_, index) =>
            svg`<line part="gridline" x1=${x(index)} x2=${x(index)} y1="0" y2=${HEIGHT} />`,
        )
      : []
    /* The floor is the baseline's, and a gridline drawn on top of it is the
       same rule twice. */
    const across = this.rulesValue
      ? ticks(domain)
          .filter((level) => level > domain[0])
          .map(
            (level) =>
              svg`<line part="gridline" x1="0" x2=${WIDTH} y1=${y(level)} y2=${y(level)} />`,
          )
      : []
    return svg`${down}${across}`
  }

  /**
   * A rule down the reading the tooltip is about.
   *
   * Over the bands rather than under them, which is the one place this differs
   * from `LineChart`: a line leaves the ground showing, and a stack does not.
   */
  protected renderGuide(x: (value: number) => number): TemplateResult | typeof nothing {
    const at = this.pointer.at
    if (at < 0) {
      return nothing
    }
    return svg`<line part="guide" x1=${x(at)} x2=${x(at)} y1="0" y2=${HEIGHT} />`
  }

  /** The reading names, as HTML beside the drawing so they do not scale with it. */
  protected renderLabels(readings: string[]): TemplateResult {
    return html`<div aria-hidden="true" part="labels">
      ${readings.map((one) => html`<span part="label">${one}</span>`)}
    </div>`
  }

  /**
   * What a reader who cannot see the bands is told.
   *
   * The latest reading, because that is the question a composition is asked
   * first, and the table has every other one. Each part in the table's order,
   * which is the legend's and the bands' order, so the words and the picture
   * name the parts the same way round.
   */
  protected renderSummary(stack: AreaStack, rows: Row[]): TemplateResult {
    const last = rows.length - 1
    const total = stack.totals[last] ?? 0
    const format = formatNumbers('')
    const shares = stack.names.map(
      (name, depth) =>
        `${name} ${percent.format(total > 0 ? (stack.values[depth]?.[last] ?? 0) / total : 0)}`,
    )
    const named = this.named ? `${this.named}, ` : ''
    return html`<p part="summary">
      ${named}${rows[last]?.label ?? ''}: ${this.totalLabel} ${format(total)}; ${shares.join(', ')}.
    </p>`
  }

  /**
   * The rows the tooltip reads, with each part's share and the total added.
   *
   * The total is a cell of its own with no number on it, so the tooltip gives it
   * no series color: it is the sum of the bands, not a band.
   */
  private tallied(rows: Row[], stack: AreaStack): Row[] {
    const format = formatNumbers('')
    return rows.map((row, index) => {
      const total = stack.totals[index] ?? 0
      return {
        ...row,
        cells: [
          ...row.cells.map((cell, column) =>
            this.share && cell.value !== undefined && stack.columns.includes(column) && total > 0
              ? {
                  ...cell,
                  text: `${cell.text} (${percent.format(Math.max(0, cell.value) / total)})`,
                }
              : cell,
          ),
          { name: this.totalLabel, text: format(total) },
        ],
      }
    })
  }

  /** What a pointer resting on a reading shows, above the top of the stack. */
  protected renderTooltip(
    stack: AreaStack,
    y: (value: number) => number,
  ): TemplateResult | typeof nothing {
    const at = this.pointer.at
    const rows = this.tallied(this.sourceRows, stack)
    if (at < 0) {
      return drawTooltip(rows, at, this.tag('tooltip'))
    }
    const slot = 100 / rows.length
    return drawTooltip(rows, at, this.tag('tooltip'), {
      placement: 'top',
      x: `${at * slot + slot / 2}%`,
      y: `${y(stack.layers.at(-1)?.[at] ?? 0)}%`,
    })
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-area-chart': HelixHeadlessAreaChart
  }
}
