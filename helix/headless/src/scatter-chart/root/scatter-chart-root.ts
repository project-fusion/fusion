import {
  CHART_PLOT,
  customElement,
  drawTooltip,
  extent,
  formatNumbers,
  HelixElement,
  linear,
  MixinChartSource,
  seriesIndex,
  ticks,
} from '@fusion.dev/helix-core'
import { html, nothing, svg, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import '../../tooltip/index.js'

/** The drawing's own coordinates. */
const WIDTH = 100
const HEIGHT = 100

/** How near a pointer has to be to a point to be asking about it, in pixels. */
const REACH = 24

const coefficient = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

/** One row drawn as a point: which row, which series, and where, in percent of the plot. */
export interface ScatterPoint {
  depth: number
  row: number
  x: number
  y: number
}

/** The table as the chart reads it: points, both ranges and what each axis is called. */
export interface ScatterField {
  points: ScatterPoint[]
  /** Each series' readings as pairs, for the summary. */
  pairs: Array<Array<[number, number]>>
  x: [number, number]
  xName: string
  y: [number, number]
  yNames: string[]
}

/**
 * A range widened to the round numbers either side of it.
 *
 * So the first and last tick are the edges of the plot rather than somewhere
 * inside it, and no point sits on the border of the box with half of itself
 * outside. Rounded to twelve places, because a step of 0.1 multiplied back out
 * is 0.30000000000000004 and a tick label would say so.
 */
const nice = ([low, high]: [number, number]): [number, number] => {
  if (low === high) {
    return [low - 1, high + 1]
  }
  const levels = ticks([low, high])
  const step = levels.length > 1 ? (levels[1] as number) - (levels[0] as number) : high - low
  const round = (value: number): number => Number(value.toPrecision(12))
  return [round(Math.floor(low / step) * step), round(Math.ceil(high / step) * step)]
}

/** Pearson's r, or nothing where there are too few points or no spread to have one. */
const correlation = (pairs: Array<[number, number]>): number | undefined => {
  if (pairs.length < 3) {
    return undefined
  }
  const mean = (values: number[]): number =>
    values.reduce((sum, one) => sum + one, 0) / values.length
  const across = mean(pairs.map(([x]) => x))
  const up = mean(pairs.map(([, y]) => y))
  let both = 0
  let xs = 0
  let ys = 0
  for (const [x, y] of pairs) {
    both += (x - across) * (y - up)
    xs += (x - across) ** 2
    ys += (y - up) ** 2
  }
  return xs === 0 || ys === 0 ? undefined : both / Math.sqrt(xs * ys)
}

/**
 * @summary Whether two measures move together, one point per row.
 *
 * @description
 * The chart for a relation rather than a series. The table's first numeric
 * column is measured across and every other numeric column is measured up, one
 * point per row, so a table of countries with a column of income and a column
 * of life expectancy draws one dot for each country. More numeric columns are
 * more series against the same across, each in its own color.
 *
 * **Both axes are measured, so both are labeled.** A line chart's readings are
 * named along the bottom and its values are read from the tooltip; here the
 * horizontal position is itself a value, and a point with no scale under it says
 * nothing about how far along it is. The ticks sit at round numbers and the
 * range is widened to them, so the plot's edges are numbers a reader can name.
 *
 * **What a reader without the picture is told is how strongly the two relate**,
 * because that is the question a scatter is drawn to answer and the one a table
 * of the same numbers makes hardest to see. The summary gives each series'
 * correlation coefficient and how many points it rests on; the table has every
 * number, and the drawing is `aria-hidden`.
 *
 * **The points are elements, not shapes in the drawing.** The drawing stretches
 * to its box, and a circle in a stretched space is an ellipse, so each point is
 * a `<span>` placed by percentage over it, which is how `LineChart` draws its
 * termini and for the same reason.
 *
 * **Left to right on every page, the one chart here that is.** A bar or a line
 * chart's across is the order its readings are named in, which follows the
 * line of text and turns with it. Here it is a measure, and a measure has a
 * direction of its own: more is to the right in every script, as a number line
 * is. So the plot, its axes and the names at their ends sit in a `plane` part
 * that carries `dir="ltr"`, which holds the y axis on the left and the points,
 * rules, ticks, pointer and tooltip mark where a left-to-right page puts them,
 * with no stylesheet asked to know. The names carry `dir="auto"`, so one written
 * in Arabic or Hebrew still reads its own way; the summary is outside the plane
 * and the bubble is told the page's direction, both being words.
 *
 * @since 0.1.0
 * @status experimental
 * @category charts
 * @aliases Scatter Plot, XY Chart, Correlation Chart, Dot Plot
 * @documentation https://helix.fusion.dev/components/scatter-chart
 *
 * @csspart gridline - One rule across the plot, under `gridlines`.
 * @csspart mark - The invisible point the tooltip is anchored to.
 * @csspart plane - The plot, both axes and their names, left to right on every page. The grid they are laid out in.
 * @csspart plot - The drawing.
 * @csspart point - One row, as a point.
 * @csspart point-active - A point of the row a pointer is asking about, beside `point`.
 * @csspart summary - How strongly the measures relate, for a reader who cannot see the points.
 * @csspart svg - The drawing surface the rules sit on.
 * @csspart tooltip - The bubble, forwarded from `Tooltip`.
 * @csspart tooltip-anchor - The `Tooltip` element itself.
 * @csspart tooltip-arrow - The bubble's point, forwarded from `Tooltip`.
 * @csspart tooltip-arrow-bottom - The point while the bubble is below the reading, so on its top edge, beside `tooltip-arrow`.
 * @csspart tooltip-arrow-left - The point while the bubble is left of the reading, so on its right edge, beside `tooltip-arrow`.
 * @csspart tooltip-arrow-right - The point while the bubble is right of the reading, so on its left edge, beside `tooltip-arrow`.
 * @csspart tooltip-arrow-top - The point while the bubble is above the reading, so on its bottom edge, beside `tooltip-arrow`.
 * @csspart tooltip-bottom - The bubble while it is below the reading, beside `tooltip`.
 * @csspart tooltip-cell - One column's name and value inside the tooltip.
 * @csspart tooltip-label - The row's own name inside the tooltip.
 * @csspart tooltip-left - The bubble while it is left of the reading, beside `tooltip`.
 * @csspart tooltip-name - A column's name inside the tooltip.
 * @csspart tooltip-right - The bubble while it is right of the reading, beside `tooltip`.
 * @csspart tooltip-top - The bubble while it is above the reading, beside `tooltip`.
 * @csspart tooltip-value - A column's value inside the tooltip.
 * @csspart x-axis - The levels measured across, under the plot.
 * @csspart x-name - What is measured across.
 * @csspart x-tick - One labeled level across. A part of its own rather than a shared `tick`, because `::part()` cannot tell which axis a tick is on.
 * @csspart y-axis - The levels measured up, beside the plot.
 * @csspart y-name - What is measured up.
 * @csspart y-tick - One labeled level up.
 *
 * @cssproperty --chart-point-x - Where a point sits across, as a percentage. Written by the component.
 * @cssproperty --chart-point-y - Where a point sits up, as a percentage from the top. Written by the component.
 * @cssproperty --chart-tick - Where a tick sits along its axis, as a percentage. Written by the component.
 */
@customElement('helix-headless-scatter-chart')
export class HelixHeadlessScatterChart extends MixinChartSource(HelixElement) {
  /**
   * What to call the strength of the relation in the summary.
   */
  @property({ attribute: 'correlation-label' })
  correlationLabel = 'correlation'

  /**
   * Which rules are drawn across the plot, if any.
   *
   * Both axes are measured, so the values name an axis rather than a role:
   * `x` rules the levels across, `y` the levels up. A bare `gridlines`, or
   * anything unrecognized, means `both`, since neither axis is the one a scatter
   * is read along.
   */
  @property()
  gridlines?: 'both' | 'x' | 'y'

  /**
   * What to call a row in the summary, which counts them.
   */
  @property({ attribute: 'points-label' })
  pointsLabel = 'points'

  /** The points as last drawn, which the pointer searches. */
  private drawn: ScatterPoint[] = []

  /** The point a pointer is resting nearest, which the tooltip sits on. */
  private nearest: ScatterPoint | undefined = undefined

  override connectedCallback(): void {
    super.connectedCallback()
    /* The controller's own search is a slot along one axis, which is right for
       readings in order and wrong for points placed by two values. It still
       owns `at` and the tooltip's repositioning; this chart tells it where.
       Here rather than in a constructor, where the manifest's analyzer reads
       the assignment as a member of this class. */
    this.pointer.axis = 'none'
    this.addEventListener('pointermove', this.handleMove)
    this.addEventListener('pointerleave', this.handleLeave)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('pointermove', this.handleMove)
    this.removeEventListener('pointerleave', this.handleLeave)
  }

  /** Whether the levels across are ruled. */
  protected get rulesX(): boolean {
    return this.gridlines !== undefined && this.gridlines !== 'y'
  }

  /** Whether the levels up are ruled. */
  protected get rulesY(): boolean {
    return this.gridlines !== undefined && this.gridlines !== 'x'
  }

  /**
   * The table as points.
   *
   * Read from the rows rather than from `series`, because a point needs both of
   * its numbers from the same row, and `series` numbers each column's readings
   * on its own once a cell is blank. A row missing either number is not drawn:
   * a point with one coordinate has nowhere to be.
   */
  protected get field(): ScatterField {
    const rows = this.sourceRows
    const width = Math.max(0, ...rows.map((row) => row.cells.length))
    const columns = Array.from({ length: width }, (_, column) => column).filter((column) =>
      rows.some((row) => row.cells[column]?.value !== undefined),
    )
    const [across, ...ups] = columns
    const name = (column: number | undefined): string =>
      column === undefined ? '' : (rows.find((row) => row.cells[column])?.cells[column]?.name ?? '')
    const pairs = ups.map((column) =>
      rows.flatMap((row, index) => {
        const x = across === undefined ? undefined : row.cells[across]?.value
        const y = row.cells[column]?.value
        return x === undefined || y === undefined ? [] : [[x, y, index] as const]
      }),
    )
    const all = pairs.flat()
    const x = nice(extent(all.length > 0 ? all.map(([one]) => one) : [0]))
    const y = nice(extent(all.length > 0 ? all.map(([, one]) => one) : [0]))
    const along = linear(x, [0, WIDTH])
    const up = linear(y, [HEIGHT, 0])
    return {
      pairs: pairs.map((series) => series.map(([one, two]) => [one, two] as [number, number])),
      points: pairs.flatMap((series, depth) =>
        series.map(([one, two, row]) => ({ depth, row, x: along(one), y: up(two) })),
      ),
      x,
      xName: name(across),
      y,
      yNames: ups.map((column) => name(column)),
    }
  }

  protected override render(): TemplateResult {
    const field = this.field
    this.drawn = field.points
    if (field.points.length === 0) {
      return html`<div dir="ltr" part="plane">
        <div id=${CHART_PLOT} part="plot"></div>
      </div>`
    }
    const format = formatNumbers('')
    const along = linear(field.x, [0, WIDTH])
    const up = linear(field.y, [HEIGHT, 0])
    return html`<div dir="ltr" part="plane">
        ${this.renderPlot(field, along, up)}
        <div aria-hidden="true" part="x-axis">
          ${ticks(field.x).map(
            (level) =>
              html`<span part="x-tick" style="--chart-tick: ${along(level)}%">${format(level)}</span>`,
          )}
        </div>
        <div aria-hidden="true" part="y-axis">
          ${ticks(field.y).map(
            (level) =>
              html`<span part="y-tick" style="--chart-tick: ${up(level)}%">${format(level)}</span>`,
          )}
        </div>
        <span aria-hidden="true" dir="auto" part="x-name">${field.xName}</span>
        <span aria-hidden="true" dir="auto" part="y-name">${field.yNames.join(', ')}</span>
      </div>
      ${this.renderSummary(field)}`
  }

  /** The rules and the points, behind a seam the styled tier can move. */
  protected renderPlot(
    field: ScatterField,
    along: (value: number) => number,
    up: (value: number) => number,
  ): TemplateResult {
    const at = this.pointer.at
    return html`<div aria-hidden="true" id=${CHART_PLOT} part="plot">
      <svg part="svg"
        preserveAspectRatio="none"
        viewBox="0 0 ${WIDTH} ${HEIGHT}"
        xmlns="http://www.w3.org/2000/svg"
      >
        ${
          this.rulesX
            ? ticks(field.x).map(
                (level) =>
                  svg`<line part="gridline" x1=${along(level)} x2=${along(level)} y1="0" y2=${HEIGHT} />`,
              )
            : nothing
        }
        ${
          this.rulesY
            ? ticks(field.y).map(
                (level) =>
                  svg`<line part="gridline" x1="0" x2=${WIDTH} y1=${up(level)} y2=${up(level)} />`,
              )
            : nothing
        }
      </svg>
      ${field.points.map((point) => {
        const index = seriesIndex(point.depth)
        return html`<span
          data-series=${index}
          ?data-active=${point.row === at}
          part="point${point.row === at ? ' point-active' : ''}"
          style=${`--chart-series: var(--chart-series-${index}); --chart-point-x: ${point.x}%; --chart-point-y: ${point.y}%`}
        ></span>`
      })}
      ${this.renderTooltip()}
    </div>`
  }

  /**
   * What a reader who cannot see the points is told.
   *
   * One clause per series, each naming what is measured up against what is
   * measured across, how many rows it rests on and its correlation, which is
   * absent where there are fewer than three points or no spread to measure.
   */
  protected renderSummary(field: ScatterField): TemplateResult {
    const clauses = field.yNames.map((name, depth) => {
      const pairs = field.pairs[depth] ?? []
      const r = correlation(pairs)
      const strength = r === undefined ? '' : `, ${this.correlationLabel} ${coefficient.format(r)}`
      return `${name} / ${field.xName}: ${pairs.length} ${this.pointsLabel}${strength}`
    })
    const named = this.named ? `${this.named}. ` : ''
    return html`<p part="summary">${named}${clauses.join('; ')}.</p>`
  }

  /** The row a pointer is resting on, over the point it is nearest. */
  protected renderTooltip(): TemplateResult | typeof nothing {
    const at = this.pointer.at
    const point = this.nearest
    if (at < 0 || !point) {
      return drawTooltip(this.sourceRows, -1, this.tag('tooltip'))
    }
    return drawTooltip(this.sourceRows, at, this.tag('tooltip'), {
      /* The host's, which the plane's `dir` does not reach: a bubble of names
         and values is words, and reads the way the page does. */
      dir: getComputedStyle(this).direction === 'rtl' ? 'rtl' : 'ltr',
      fixed: true,
      placement: 'top',
      x: `${point.x}%`,
      y: `${point.y}%`,
    })
  }

  /**
   * The point a pointer is nearest, within reach.
   *
   * Measured in the plot's pixels rather than in percent, because the plot is
   * rarely square and a percent across is a different distance from a percent
   * up. A mouse or a pen only, as every chart here: a finger has no hover to
   * rest on a point with.
   */
  private readonly handleMove = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') {
      return
    }
    const box = this.partNamed('plot')?.getBoundingClientRect()
    if (!box || box.width === 0 || box.height === 0) {
      return
    }
    const across = event.clientX - box.left
    const up = event.clientY - box.top
    let found: ScatterPoint | undefined
    let best = REACH ** 2
    for (const point of this.drawn) {
      const distance =
        ((point.x / WIDTH) * box.width - across) ** 2 + ((point.y / HEIGHT) * box.height - up) ** 2
      if (distance <= best) {
        best = distance
        found = point
      }
    }
    if (found !== this.nearest) {
      this.nearest = found
      this.pointer.set(found?.row ?? -1)
      this.requestUpdate()
    }
  }

  private readonly handleLeave = (): void => {
    this.nearest = undefined
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-scatter-chart': HelixHeadlessScatterChart
  }
}
