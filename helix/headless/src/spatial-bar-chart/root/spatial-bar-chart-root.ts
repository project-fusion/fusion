import {
  AriaForwardController,
  type Camera,
  CHART_PLOT,
  customElement,
  depthOrder,
  drawTooltip,
  formatWords,
  HelixElement,
  HelixPlotChangeEvent,
  HelixPlotTurnEvent,
  HelixReadingChangeEvent,
  HelixReadingPressEvent,
  isRtl,
  MixinChartSource,
  MixinChartStatus,
  spokenReading,
  words,
} from '@fusion.dev/helix-core'
import {
  html,
  nothing,
  type PropertyValues,
  type SVGTemplateResult,
  svg,
  type TemplateResult,
} from 'lit'
import { property, state } from 'lit/decorators.js'
import '../../tooltip/index.js'
import {
  boxView,
  DragTurn,
  drawBox,
  SPATIAL_VIEW,
  turned,
} from '../../spatial-scatter-chart/view.js'
import { type BarField, barsDrawn, barsOf, type DrawnBar } from '../bars.js'

/** The arrow keys that turn the view while Shift is held, and which way each turns it. */
const TURNS: Record<string, { across: number; up: number }> = {
  ArrowDown: { across: 0, up: -1 },
  ArrowLeft: { across: -1, up: 0 },
  ArrowRight: { across: 1, up: 0 },
  ArrowUp: { across: 0, up: 1 },
}

/** How many series colors the theme has, after which they come round again. */
const SERIES = 24

/**
 * @summary A bar chart drawn in three dimensions, each bar a block as tall as its value, for categories in one or more series.
 *
 * @description
 * A 3D bar chart reads its table as `Bar Chart` does: **each row is a
 * category, named by its label, and each numeric column a series**, named by
 * its heading. The bars stand on a grid of categories across and series in
 * depth, each as tall as its value from zero and colored by its series, so
 * one series is a single row of bars and several make a block of them.
 *
 * **The flat `Bar Chart` is read more exactly.** Measured, a reader judges
 * a 3D bar's value less closely than a flat one's, and a bar can stand
 * behind another. Use this one where the shape across two sets of names
 * matters more than any one exact value, such as sales by region and by
 * quarter. The tooltip and the table carry the exact values, and a drag
 * turns the view to show a bar another hides.
 *
 * **Helix draws the frame, and the chart draws the bars in 3D itself, in
 * SVG**: a picture a print and a page without WebGL show too, which a drag
 * or Shift with an arrow turns. Put a box inside the chart, and
 * `connectSpatialBarChart` from `@fusion.dev/helix-plot`, given
 * `threeBarDriver` from `@fusion.dev/helix-plot/three`, draws the bars in it
 * with three.js, lit and in perspective.
 *
 * **The table is the reading.** Every number is in it, and screen readers
 * read it. The `summary` part names the number of bars, series, and
 * categories, and the range of values, and describes the plot.
 *
 * **The plot is read by key, across and in depth.** It takes focus, named by
 * `label` or the caption. The left and right arrows move from category to
 * category, the down and up arrows from series to series, and Home and End
 * go to the first and the last bar. The `live` part says the bar's category,
 * series, and value in words. Shift with an arrow turns the view, and
 * Escape lets the bar go.
 *
 * **A reading shows its row in a tooltip**, as on every chart: the bar a
 * mouse or a pen rests on, the bar tapped, or the one the keys move to.
 *
 * **Readings are sent as every chart sends them.** `helix-reading-change`
 * says each move of the reading, and `helix-reading-press` a bar clicked or
 * pressed with Enter or Space, each with the row of the table in `index`.
 *
 * **Keyboard.** The plot is one tab stop once it has readings.
 *
 * | Key | What it does |
 * |---|---|
 * | Tab | Moves focus to the plot. |
 * | Right, Left | Moves to the next or the previous category. |
 * | Down, Up | Moves to the next or the previous series. |
 * | Home, End | Moves to the first or the last bar. |
 * | Shift with an arrow | Turns the view across, or tilts it up and down. |
 * | Enter, Space | Presses the bar, which sends `helix-reading-press`. |
 * | Escape | Lets the bar go. |
 *
 * @since 0.196.0
 * @status experimental
 * @category charts
 * @aliases 3D bar chart, 3D column chart, Isometric bar chart, Isometric column chart, Bar chart in 3D
 * @documentation https://fusion.dev/helix/components/spatial-bar-chart
 *
 * @slot - The renderer's box, which the 3D drawing is made in.
 * @slot empty - Content shown when the table has no readings. Falls back to `empty-text`.
 * @slot loading - Content shown while `loading` is set and there are no readings yet. Falls back to `loading-text`.
 *
 * @event {HelixPlotChangeEvent} helix-plot-change - The bars or the bar the keys rest on changed, which the renderer is told. It stays on the chart.
 * @event {HelixPlotTurnEvent} helix-plot-turn - Shift with an arrow asked the view to turn, by a step across or up.
 * @event {HelixReadingChangeEvent} helix-reading-change - The reading moved, or was put away: `index` is the row, or `-1` for none, with its `label` and the `pointerType` that moved it.
 * @event {HelixReadingPressEvent} helix-reading-press - A bar was clicked or pressed with Enter or Space, with the same detail as `helix-reading-change`.
 *
 * @csspart axis-name - A measure's name, along its edge of the box, in the chart's own drawing.
 * @csspart bar - One bar, its faces in its series' color.
 * @csspart bar-active - The bar the pointer or the keys rest on. Set alongside `bar`.
 * @csspart drawing - The chart's own drawing in SVG: the box, its grid and names, and the bars.
 * @csspart empty - The words when the table has no readings: the `empty` slot, falling back to `empty-text`.
 * @csspart face - One face of a bar the view shows, shaded by which way it faces.
 * @csspart fallback - The box the chart's own drawing fills, shown until a renderer has drawn and where none is connected. Hidden from screen readers.
 * @csspart grid - The box's edges and its grid, in the chart's own drawing.
 * @csspart live - The readout: a polite live region that says the bar the keys moved to. Hide it visually.
 * @csspart loading - The words while `loading` is set and there are no readings.
 * @csspart mark - The invisible point the tooltip is anchored to, where the renderer draws the reading.
 * @csspart plot - The box the drawing fills, which takes focus to be read by key. It is named by the host's `aria-labelledby` or `aria-label`, then by `label`, then by the caption of the table.
 * @csspart ring - The outline around the bar the pointer or the keys rest on, drawn over the bars.
 * @csspart summary - The number of bars, series, and categories, and the range of values, written as a sentence for screen readers, which describes the plot. Hide it visually.
 * @csspart table - The readings as a table, for a screen reader, rendered only where they were drawn from `data`. Hide it visually.
 * @csspart tick - A category's or a series' name, or a value at a tick, along its edge of the box, in the chart's own drawing.
 * @csspart tooltip - The bubble, forwarded from `Tooltip`.
 * @csspart tooltip-anchor - The `Tooltip` element itself.
 * @csspart tooltip-arrow - The bubble's point, forwarded from `Tooltip`.
 * @csspart tooltip-arrow-bottom - The point while the bubble is below the reading, on its top edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-arrow-left - The point while the bubble is left of the reading, on its right edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-arrow-right - The point while the bubble is right of the reading, on its left edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-arrow-top - The point while the bubble is above the reading, on its bottom edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-bottom - The bubble while it is below the reading. Set alongside `tooltip`.
 * @csspart tooltip-cell - One column's name and value inside the tooltip.
 * @csspart tooltip-cell-current - The cell a chart's series keys rest on, which every chart's tooltip can mark. This chart marks none, since its readout says the measure. Set alongside `tooltip-cell`.
 * @csspart tooltip-label - The row's own name inside the tooltip.
 * @csspart tooltip-left - The bubble while it is left of the reading. Set alongside `tooltip`.
 * @csspart tooltip-name - A column's name inside the tooltip.
 * @csspart tooltip-right - The bubble while it is right of the reading. Set alongside `tooltip`.
 * @csspart tooltip-top - The bubble while it is above the reading. Set alongside `tooltip`.
 * @csspart tooltip-value - A column's value inside the tooltip.
 *
 * @cssproperty --spatial-bar-chart-shade - How far a bar's face turns from the light, from 0 for its top. The component writes it on each face, and the stylesheet that shades the face reads it.
 *
 * @cssstate active - While a bar is shown, under the pointer or the keys.
 * @cssstate drawn - While a renderer has drawn the bars, and the chart's own drawing is hidden.
 * @cssstate empty - While the `empty` part stands in place of the readings.
 * @cssstate loading - While the `loading` part stands in place of the readings.
 */
@customElement('helix-headless-spatial-bar-chart')
export class HelixHeadlessSpatialBarChart extends MixinChartStatus(MixinChartSource(HelixElement)) {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-spatial-bar-chart': { emptyText: 'Keine Werte' } })`.
   */
  static words = 'helix-spatial-bar-chart'

  /**
   * What the readout says for a place with no value. `{category}` and
   * `{series}` name the place.
   */
  @words
  @property({ attribute: 'open-label' })
  openLabel = '{category}, {series}: no value'

  /** The plot's name where the chart has none: no `aria-label`, `label`, or table caption. */
  @words
  @property({ attribute: 'plot-label' })
  plotLabel = '3D bar chart'

  /**
   * The `summary` part's sentence. `{count}`, `{series}`, and `{categories}`
   * are the number of bars, series, and categories, written in the locale,
   * and `{low}` and `{high}` the lowest and the highest value.
   */
  @words
  @property({ attribute: 'summary-label' })
  summaryLabel =
    '{count, plural, one {# bar} other {# bars}} in {series, plural, one {# series} other {# series}} over {categories, plural, one {# category} other {# categories}}, from {low} to {high}.'

  /** Whether a renderer has drawn the bars, which hides the chart's own drawing. */
  @state()
  private rendered = false

  /** Where the chart's own drawing is seen from, which a drag or Shift with an arrow turns. */
  @state()
  private camera: Camera = SPATIAL_VIEW

  /** A drag across the chart's own drawing, which turns its view. */
  private readonly drag = new DragTurn(
    (next) => {
      this.camera = next(this.camera)
    },
    () => this.requestUpdate(),
  )

  /** Where the renderer draws the reading, which the tooltip points at. */
  @state()
  private place: { x: number; y: number } | undefined

  /** The field last told, kept so a change of it can be told. */
  private last: BarField | undefined

  /** The bar the keys rested on last, so a change of it can be told. */
  private told = -1

  /** Carries a host `aria-labelledby` and `aria-describedby` to the plot. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('plot'),
  })

  /**
   * The table read as bars. **Each row is a category, and each numeric
   * column a series.** A renderer reads it.
   */
  get field(): BarField {
    const rows = this.sourceRows
    const columns = this.plottedColumns
    if (this.memo?.rows !== rows || this.memo.columns !== columns) {
      this.memo = { columns, field: barsOf(rows, columns), rows }
    }
    return this.memo.field
  }

  /** The field last read, and the rows and columns it was read from. */
  private memo: { columns: unknown; field: BarField; rows: unknown } | undefined

  /** The bar the keys or the pointer rest on, as its place in `field.cells`, or `-1`. */
  get active(): number {
    return this.pointer.at
  }

  /** The number of places on the grid, which the keys walk. */
  override get readings(): number {
    return this.field.cells.length
  }

  /**
   * Says whether a renderer has drawn the bars, which hides the chart's own
   * drawing or shows it again. Called by the connector.
   */
  rendererDrawn(on = true): void {
    this.rendered = on
    this.toggleState('drawn', on)
  }

  /**
   * Puts the reading on the bar at `index`, or lets it go with `-1`, as a
   * pointer resting on it in the renderer's drawing or a press there does.
   * A touch keeps it until a tap lands elsewhere, and a mouse leaving a
   * reading the keys moved to leaves it. Called by the connector.
   */
  requestActive(index: number, kind: 'mouse' | 'pen' | 'touch' = 'mouse'): void {
    if (kind === 'touch') {
      this.pointer.tapTo(index)
    } else if (index >= 0 || !this.pointer.keyed) {
      this.pointer.set(index)
    }
  }

  /**
   * Says where the renderer draws the reading, as fractions of the plot from
   * its top left, or `undefined` while it draws none. The tooltip points
   * there. Called by the connector.
   */
  placeReading(at: { x: number; y: number } | undefined): void {
    this.place = at
  }

  /**
   * Tells the keys how many series stand in depth for each category, so the
   * up and down arrows move from series to series and the left and right
   * arrows from category to category. Here rather than in `updated`, since
   * the server calls this one.
   */
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed)
    this.pointer.grid = Math.max(1, this.field.series.length)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* The bar under a pointer is found by what the pointer is over, so the
       controller's search along one axis stays out. */
    this.pointer.axis = 'none'
    this.pointer.onReading = (heard, detail) => {
      const cell = this.field.cells[detail.index]
      const told = {
        ...detail,
        index: cell?.value === undefined ? -1 : cell.row,
        label: cell?.label ?? '',
      }
      this.dispatchEvent(
        heard === 'press' ? new HelixReadingPressEvent(told) : new HelixReadingChangeEvent(told),
      )
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* Told only on a change, so a renderer draws again only when it must:
       the field is read once for each table, so a new one is a change. */
    const field = this.field
    if (field !== this.last) {
      this.last = field
      this.dispatchEvent(new HelixPlotChangeEvent({ kind: 'data' }))
    }
    if (this.pointer.at !== this.told) {
      this.told = this.pointer.at
      this.dispatchEvent(new HelixPlotChangeEvent({ kind: 'focus' }))
    }
    /* The tooltip follows the reading while the view turns, which moves its
       mark without anything the tooltip watches changing size. */
    if (changed.has('place' as keyof this)) {
      ;(
        this.renderRoot.querySelector('[for="helix-chart-mark"]') as
          | (Element & { reposition?: () => void })
          | null
      )?.reposition?.()
    }
  }

  /**
   * Shift with an arrow turns the view, the chart's own drawing and the
   * renderer's alike, and moves no reading.
   */
  private readonly onPlotKeydown = (event: KeyboardEvent): void => {
    const turn = TURNS[event.key]
    if (!event.shiftKey || !turn || event.altKey || event.ctrlKey || event.metaKey) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    this.camera = turned(this.camera, turn.across, turn.up)
    this.dispatchEvent(new HelixPlotTurnEvent(turn))
  }

  /** The bar a pointer event is over, or `-1`: the one in front, since the bars are painted back to front. */
  private barAt(event: PointerEvent): number {
    const bar = (event.composedPath()[0] as Element | undefined)?.closest?.('[data-index]')
    const index = Number(bar?.getAttribute('data-index') ?? -1)
    return Number.isInteger(index) ? index : -1
  }

  /** A mouse or a pen over the chart's own drawing puts the reading on the bar it rests on. */
  private readonly onDrawingMove = (event: PointerEvent): void => {
    if (this.drag.move(event)) {
      return
    }
    if (event.pointerType === 'touch') {
      return
    }
    this.requestActive(this.barAt(event), event.pointerType === 'pen' ? 'pen' : 'mouse')
  }

  private readonly onDrawingDown = (event: PointerEvent): void => {
    this.drag.down(event)
  }

  /** A press the browser took back, such as for a scroll, which ends a drag as a release does. */
  private readonly onDrawingCancel = (event: PointerEvent): void => {
    this.drag.up(event)
  }

  private readonly onDrawingLeave = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') {
      this.requestActive(-1, 'mouse')
    }
  }

  /**
   * A tap is a touch reader's hover, unless it was a drag, which turned the
   * view: it shows the bar under it until a tap lands elsewhere.
   */
  private readonly onDrawingTap = (event: PointerEvent): void => {
    if (this.drag.up(event)) {
      return
    }
    if (event.pointerType === 'touch') {
      this.requestActive(this.barAt(event), 'touch')
    }
  }

  protected override render(): TemplateResult {
    const field = this.field
    const readable = field.readings > 0
    const at = this.pointer.at
    const cell = field.cells[at]
    return html`<div
        aria-describedby=${readable ? 'helix-chart-summary' : nothing}
        aria-label=${this.named || this.plotLabel}
        id=${CHART_PLOT}
        part="plot"
        role=${readable ? 'application' : 'img'}
        tabindex=${readable ? '0' : nothing}
        @keydown=${this.onPlotKeydown}
      >
        <slot></slot>
        ${readable ? this.renderFallback(field, at) : nothing}
        ${readable ? this.renderLive(field, at) : nothing}
        ${this.renderTooltip(cell?.value === undefined ? undefined : cell.row)}
      </div>
      ${readable ? this.renderSummary(field) : this.renderStatus()}${this.renderTable()}`
  }

  /**
   * The bars in 3D, in SVG: the box with its grid and names, and each bar a
   * block standing from zero to its value, painted back to front, in its
   * series' color and shaded by which way each face turns. The chart's own
   * drawing, until a renderer has drawn and where none is connected.
   */
  private renderFallback(field: BarField, at: number): TemplateResult {
    const view = boxView(field.axes, this.camera)
    const bars = barsDrawn(field, view.projection)
    const active = bars.find((bar) => bar.index === at)
    const cell = field.cells[at]
    const bounds = this.drag.frame(view.bounds, view.on([0, 0, 0]))
    return html`<div aria-hidden="true" dir="ltr" ?hidden=${this.rendered} part="fallback">
      <svg
        part="drawing"
        preserveAspectRatio="xMidYMid meet"
        viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}"
        xmlns="http://www.w3.org/2000/svg"
        @click=${this.drag.click}
        @pointercancel=${this.onDrawingCancel}
        @pointerdown=${this.onDrawingDown}
        @pointerleave=${this.onDrawingLeave}
        @pointermove=${this.onDrawingMove}
        @pointerup=${this.onDrawingTap}
      >${drawBox(view)}${depthOrder(view.projection, bars).map((bar) =>
        this.renderBar(field, bar, at),
      )}${
        active
          ? svg`<path d=${active.drawn.outline} part="ring"></path><foreignObject height="0.001" overflow="visible" width="0.001" x=${active.drawn.peak.x} y=${active.drawn.peak.y}>${this.renderOwnTooltip(cell?.row)}</foreignObject>`
          : nothing
      }</svg>
    </div>`
  }

  /** One bar, its faces in its series' color, each shaded by which way it faces. */
  private renderBar(field: BarField, bar: DrawnBar, at: number): SVGTemplateResult {
    const depth = field.cells[bar.index]?.depth ?? 0
    const short = (value: number): number => Math.round(value * 1000) / 1000
    return svg`<g data-index=${bar.index} part="bar${bar.index === at ? ' bar-active' : ''}" style="--chart-series: var(--chart-series-${(depth % SERIES) + 1})">${bar.drawn.faces.map((face) => svg`<path d=${face.d} part="face" style="--spatial-bar-chart-shade: ${short(face.darken)}"></path>`)}</g>`
  }

  /** The readout: the bar's category, series, and value in words, once the keys have moved to one. */
  private renderLive(field: BarField, at: number): TemplateResult {
    const cell = field.cells[at]
    const row = cell === undefined ? undefined : this.sourceRows[cell.row]
    let said = ''
    if (this.pointer.keyed && cell) {
      said =
        row && cell.value !== undefined
          ? spokenReading(row, cell.column, (one) => this.pointer.shows(one), this.pointer.position)
          : formatWords(this, 'openLabel', {
              category: cell.label,
              series: field.series[cell.depth] ?? '',
            })
    }
    return html`<span aria-live="polite" part="live" role="status">${said}</span>`
  }

  /**
   * The reading's row in the tooltip, pointed at its bar in the chart's own
   * drawing, which holds it there.
   */
  private renderOwnTooltip(row: number | undefined): TemplateResult | typeof nothing {
    if (this.rendered || row === undefined || !this.sourceRows[row]) {
      return nothing
    }
    return drawTooltip(
      this.sourceRows,
      row,
      this.tag('tooltip'),
      { dir: isRtl(this) ? 'rtl' : 'ltr', fixed: true, placement: 'top', x: '0%', y: '0%' },
      () => undefined,
    )
  }

  /**
   * The reading's row in the tooltip every chart shows, pointed at where the
   * renderer draws it. Only once a renderer has drawn; until then the
   * chart's own drawing holds the tooltip at the bar.
   */
  private renderTooltip(row: number | undefined): TemplateResult | typeof nothing {
    const place = this.place
    if (!this.rendered || !place || row === undefined || !this.sourceRows[row]) {
      return nothing
    }
    /* A row's names and values are words, and read the way the page does,
       while the drawing is the same on every page. */
    return drawTooltip(
      this.sourceRows,
      row,
      this.tag('tooltip'),
      {
        dir: isRtl(this) ? 'rtl' : 'ltr',
        fixed: true,
        placement: 'top',
        x: `${place.x * 100}%`,
        y: `${place.y * 100}%`,
      },
      () => undefined,
    )
  }

  /** What the plot shows, in a sentence, which describes the plot. */
  private renderSummary(field: BarField): TemplateResult {
    const values = field.cells.flatMap((cell) => (cell.value === undefined ? [] : [cell.value]))
    const said = formatWords(this, 'summaryLabel', {
      categories: field.categories.length,
      count: field.readings,
      high: Math.max(...values),
      low: Math.min(...values),
      series: field.series.length,
    })
    return html`<p id="helix-chart-summary" part="summary">${said}</p>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-spatial-bar-chart': HelixHeadlessSpatialBarChart
  }
}
