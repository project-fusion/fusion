import {
  AriaForwardController,
  type Camera,
  CHART_PLOT,
  customElement,
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
  boundsOf,
  boxView,
  DragTurn,
  drawBox,
  nearestTo,
  type Placed,
  SPATIAL_VIEW,
  turned,
} from '../../spatial-scatter-chart/view.js'
import { type DrawnRibbon, type RibbonField, ribbonsDrawn, ribbonsOf } from '../ribbons.js'

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
 * @summary A chart that draws each series as a ribbon in three dimensions, its top following the values, for several series over one set of places.
 *
 * @description
 * A 3D ribbon chart reads its table as `Line Chart` does: **each row is a
 * place across, such as a day, named by its label, and each numeric column a
 * series**, named by its heading. Each series is a ribbon in a depth of its
 * own, the first in front, its top following the values and its face falling
 * to zero, so several series that would tangle as lines stand apart.
 *
 * **The flat `Line Chart` is read more exactly.** Use this one where the
 * shape of each series, and how the series differ, matters more than any one
 * value, such as response times by region over a month. The tooltip and the
 * table carry the exact values, and a drag turns the view to show a ribbon
 * another hides.
 *
 * **Helix draws the frame, and the chart draws the ribbons in 3D itself, in
 * SVG**: a picture a print and a page without WebGL show too, which a drag
 * or Shift with an arrow turns. Put a box inside the chart, and
 * `connectSpatialRibbonChart` from `@fusion.dev/helix-plot`, given
 * `threeRibbonDriver` from `@fusion.dev/helix-plot/three`, draws the ribbons
 * in it with three.js, lit and in perspective.
 *
 * **The table is the reading.** Every number is in it, and screen readers
 * read it. The `summary` part names the number of readings, series, and
 * places, and the range of values, and describes the plot.
 *
 * **The plot is read by key, across and in depth.** It takes focus, named by
 * `label` or the caption. The left and right arrows move from place to
 * place, the down and up arrows from series to series, and Home and End go
 * to the first and the last reading. The `live` part says the reading's
 * place, series, and value in words. Shift with an arrow turns the view, and
 * Escape lets the reading go.
 *
 * **A reading shows its row in a tooltip**, as on every chart: the reading a
 * mouse or a pen rests nearest, the one tapped, or the one the keys move to.
 *
 * **Readings are sent as every chart sends them.** `helix-reading-change`
 * says each move of the reading, and `helix-reading-press` a reading clicked
 * or pressed with Enter or Space, each with the row of the table in `index`.
 *
 * **Keyboard.** The plot is one tab stop once it has readings.
 *
 * | Key | What it does |
 * |---|---|
 * | Tab | Moves focus to the plot. |
 * | Right, Left | Moves to the next or the previous place. |
 * | Down, Up | Moves to the next or the previous series. |
 * | Home, End | Moves to the first or the last reading. |
 * | Shift with an arrow | Turns the view across, or tilts it up and down. |
 * | Enter, Space | Presses the reading, which sends `helix-reading-press`. |
 * | Escape | Lets the reading go. |
 *
 * @since 0.198.0
 * @status experimental
 * @category charts
 * @aliases 3D ribbon chart, 3D line chart, Ribbon chart, Waterfall plot, Line chart in 3D
 * @documentation https://fusion.dev/helix/components/spatial-ribbon-chart
 *
 * @slot - The renderer's box, which the 3D drawing is made in.
 * @slot empty - Content shown when the table has no readings. Falls back to `empty-text`.
 * @slot loading - Content shown while `loading` is set and there are no readings yet. Falls back to `loading-text`.
 *
 * @event {HelixPlotChangeEvent} helix-plot-change - The readings or the reading the keys rest on changed, which the renderer is told. It stays on the chart.
 * @event {HelixPlotTurnEvent} helix-plot-turn - Shift with an arrow asked the view to turn, by a step across or up.
 * @event {HelixReadingChangeEvent} helix-reading-change - The reading moved, or was put away: `index` is the row, or `-1` for none, with its `label` and the `pointerType` that moved it.
 * @event {HelixReadingPressEvent} helix-reading-press - A reading was clicked or pressed with Enter or Space, with the same detail as `helix-reading-change`.
 *
 * @csspart axis-name - A measure's name, along its edge of the box, in the chart's own drawing.
 * @csspart drawing - The chart's own drawing in SVG: the box, its grid and names, and the ribbons.
 * @csspart empty - The words when the table has no readings: the `empty` slot, falling back to `empty-text`.
 * @csspart face - One face of a ribbon the view shows: a piece of its top, an end, or its side, shaded by how far it turns from the light.
 * @csspart fallback - The box the chart's own drawing fills, shown until a renderer has drawn and where none is connected. Hidden from screen readers.
 * @csspart grid - The box's edges and its grid, in the chart's own drawing.
 * @csspart live - The readout: a polite live region that says the reading the keys moved to. Hide it visually.
 * @csspart loading - The words while `loading` is set and there are no readings.
 * @csspart mark - The invisible point the tooltip is anchored to, where the renderer draws the reading.
 * @csspart plot - The box the drawing fills, which takes focus to be read by key. It is named by the host's `aria-labelledby` or `aria-label`, then by `label`, then by the caption of the table.
 * @csspart ribbon - One ribbon, its faces in its series' color.
 * @csspart ring - The ring around the reading the pointer or the keys rest on, drawn over the ribbons.
 * @csspart summary - The number of readings, series, and places, and the range of values, written as a sentence for screen readers, which describes the plot. Hide it visually.
 * @csspart table - The readings as a table, for a screen reader, rendered only where they were drawn from `data`. Hide it visually.
 * @csspart tick - A place's or a series' name, or a value at a tick, along its edge of the box, in the chart's own drawing.
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
 * @cssproperty --spatial-ribbon-chart-shade - How far a ribbon's face turns from the light, from 0 for a level top. The component writes it on each face, and the stylesheet that shades the face reads it.
 *
 * @cssstate active - While a reading is shown, under the pointer or the keys.
 * @cssstate drawn - While a renderer has drawn the ribbons, and the chart's own drawing is hidden.
 * @cssstate empty - While the `empty` part stands in place of the readings.
 * @cssstate loading - While the `loading` part stands in place of the readings.
 */
@customElement('helix-headless-spatial-ribbon-chart')
export class HelixHeadlessSpatialRibbonChart extends MixinChartStatus(
  MixinChartSource(HelixElement),
) {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-spatial-ribbon-chart': { emptyText: 'Keine Werte' } })`.
   */
  static words = 'helix-spatial-ribbon-chart'

  /**
   * Draws no box: no edges, grid, numbers, or names, so the readings stand
   * alone and fill the plot, as a picture on a product's own page does. The
   * table, the summary, the tooltip, and the keys still carry every value,
   * and a renderer draws no box either.
   */
  @property({ attribute: 'no-box', reflect: true, type: Boolean })
  noBox = false

  /**
   * What the readout says for a reading the table has no value for.
   * `{place}` and `{series}` name it.
   */
  @words
  @property({ attribute: 'open-label' })
  openLabel = '{place}, {series}: no value'

  /** The plot's name where the chart has none: no `aria-label`, `label`, or table caption. */
  @words
  @property({ attribute: 'plot-label' })
  plotLabel = '3D ribbon chart'

  /**
   * The `summary` part's sentence. `{count}`, `{series}`, and `{places}` are
   * the number of readings, series, and places, written in the locale,
   * and `{low}` and `{high}` the lowest and the highest value.
   */
  @words
  @property({ attribute: 'summary-label' })
  summaryLabel =
    '{count, plural, one {# reading} other {# readings}} in {series, plural, one {# series} other {# series}} over {places, plural, one {# place} other {# places}}, from {low} to {high}.'

  /** Whether a renderer has drawn the ribbons, which hides the chart's own drawing. */
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
  private last: RibbonField | undefined

  /** The reading the keys rested on last, so a change of it can be told. */
  private told = -1

  /** Carries a host `aria-labelledby` and `aria-describedby` to the plot. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('plot'),
  })

  /**
   * The table read as ribbons. **Each row is a place across, and each
   * numeric column a series.** A renderer reads it.
   */
  get field(): RibbonField {
    const rows = this.sourceRows
    const columns = this.plottedColumns
    if (this.memo?.rows !== rows || this.memo.columns !== columns) {
      this.memo = { columns, field: ribbonsOf(rows, columns), rows }
    }
    return this.memo.field
  }

  /** The field last read, and the rows and columns it was read from. */
  private memo: { columns: unknown; field: RibbonField; rows: unknown } | undefined

  /** The reading the keys or the pointer rest on, as its place in `field.cells`, or `-1`. */
  get active(): number {
    return this.pointer.at
  }

  /** The number of places on the grid, which the keys walk. */
  override get readings(): number {
    return this.field.cells.length
  }

  /**
   * Says whether a renderer has drawn the ribbons, which hides the chart's own
   * drawing or shows it again. Called by the connector.
   */
  rendererDrawn(on = true): void {
    this.rendered = on
    this.toggleState('drawn', on)
  }

  /**
   * Puts the reading on the one at `index`, or lets it go with `-1`, as a
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
   * Tells the keys how many series stand in depth for each place, so the
   * up and down arrows move from series to series and the left and right
   * arrows from place to place. Here rather than in `updated`, since
   * the server calls this one.
   */
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed)
    this.pointer.grid = Math.max(1, this.field.series.length)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* The reading nearest a pointer is found in the drawing, so the
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

  /** Each reading where the chart's own drawing put it, which the pointer finds. */
  private placed: Placed[] = []

  /** A mouse or a pen over the chart's own drawing puts the reading on the one nearest it. */
  private readonly onDrawingMove = (event: PointerEvent): void => {
    if (this.drag.move(event)) {
      return
    }
    if (event.pointerType === 'touch') {
      return
    }
    this.requestActive(
      nearestTo(event.currentTarget as SVGSVGElement, event, this.placed),
      event.pointerType === 'pen' ? 'pen' : 'mouse',
    )
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
   * view: it shows the reading nearest it until a tap lands elsewhere.
   */
  private readonly onDrawingTap = (event: PointerEvent): void => {
    if (this.drag.up(event)) {
      return
    }
    if (event.pointerType === 'touch') {
      this.requestActive(
        nearestTo(event.currentTarget as SVGSVGElement, event, this.placed, 24),
        'touch',
      )
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
   * The ribbons in 3D, in SVG: the box with its grid and names, and each
   * series a ribbon, painted back to front, each in its series' color with
   * its faces shaded by how far they turn from the light. The chart's own
   * drawing, until a renderer has drawn and where none is connected.
   */
  private renderFallback(field: RibbonField, at: number): TemplateResult {
    const view = boxView(field.axes, this.camera, [], this.noBox)
    const ribbons = ribbonsDrawn(field, view.projection).sort(
      (one, other) => one.depth - other.depth,
    )
    const places = ribbons.flatMap((ribbon) => ribbon.readings)
    this.placed = places
    const active = places.find((place) => place.index === at)
    const cell = field.cells[at]
    const bounds = this.drag.frame(
      this.noBox
        ? boundsOf(
            ribbons.flatMap((ribbon) => ribbon.outline),
            0.1,
          )
        : view.bounds,
      view.on([0, 0, 0]),
    )
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
      >${this.noBox ? nothing : drawBox(view)}${ribbons.map((ribbon) => this.renderRibbon(ribbon))}${
        active
          ? svg`<circle cx=${active.x} cy=${active.y} part="ring" r="0.06"></circle><foreignObject height="0.001" overflow="visible" width="0.001" x=${active.x} y=${active.y}>${this.renderOwnTooltip(cell?.row)}</foreignObject>`
          : nothing
      }</svg>
    </div>`
  }

  /** One ribbon, its faces in its series' color, each shaded by how far it turns from the light. */
  private renderRibbon(ribbon: DrawnRibbon): SVGTemplateResult {
    const short = (value: number): number => Math.round(value * 1000) / 1000
    return svg`<g part="ribbon" style="--chart-series: var(--chart-series-${(ribbon.series % SERIES) + 1})">${ribbon.faces.map((face) => svg`<path d=${face.d} part="face" style="--spatial-ribbon-chart-shade: ${short(face.shade)}"></path>`)}</g>`
  }

  /** The readout: the reading's place, series, and value in words, once the keys have moved to one. */
  private renderLive(field: RibbonField, at: number): TemplateResult {
    const cell = field.cells[at]
    const row = cell === undefined ? undefined : this.sourceRows[cell.row]
    let said = ''
    if (this.pointer.keyed && cell) {
      said =
        row && cell.value !== undefined
          ? spokenReading(row, cell.column, (one) => this.pointer.shows(one), this.pointer.position)
          : formatWords(this, 'openLabel', {
              place: cell.label,
              series: field.series[cell.depth] ?? '',
            })
    }
    return html`<span aria-live="polite" part="live" role="status">${said}</span>`
  }

  /**
   * The reading's row in the tooltip, pointed at it in the chart's own
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
   * chart's own drawing holds the tooltip at the reading.
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
  private renderSummary(field: RibbonField): TemplateResult {
    const values = field.cells.flatMap((cell) => (cell.value === undefined ? [] : [cell.value]))
    const said = formatWords(this, 'summaryLabel', {
      count: field.readings,
      high: Math.max(...values),
      low: Math.min(...values),
      places: field.categories.length,
      series: field.series.length,
    })
    return html`<p id="helix-chart-summary" part="summary">${said}</p>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-spatial-ribbon-chart': HelixHeadlessSpatialRibbonChart
  }
}
