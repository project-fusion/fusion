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
  shortNumber,
  spokenReading,
  words,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, svg, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import '../../tooltip/index.js'
import { fieldOf, type PlotField, type PlotPoint } from '../field.js'
import {
  type BoxPoint,
  boundsOf,
  boxView,
  DragTurn,
  drawBox,
  inBox,
  nearestTo,
  type Placed,
  PlotRoomWatch,
  SPATIAL_VIEW,
  turned,
  wordsFitted,
} from '../view.js'

/** How many series colors the palette has, after which the groups take them again. */
const SERIES = 24

/** The arrow keys that turn the view while Shift is held, and which way each turns it. */
const TURNS: Record<string, { across: number; up: number }> = {
  ArrowDown: { across: 0, up: -1 },
  ArrowLeft: { across: -1, up: 0 },
  ArrowRight: { across: 1, up: 0 },
  ArrowUp: { across: 0, up: 1 },
}

/**
 * @summary A chart that plots each row as a point in three dimensions, for data with three measures.
 *
 * @description
 * A 3D scatter chart shows how three measures relate. The table's first
 * three numeric columns are measured across, up, and in depth, and each row
 * is one point. `group-by` names a column of text, such as a team or a
 * cluster, and each group is drawn in its own color.
 *
 * **Helix draws the frame, and a renderer draws the points in 3D.** Put a
 * box for the renderer inside the chart, and `connectSpatialScatterChart` from
 * `@fusion.dev/helix-plot`, given `threeScatterDriver` from
 * `@fusion.dev/helix-plot/three`, draws the points in it with three.js and
 * keeps it in step with the chart. Until a renderer has drawn, and where none is
 * connected, the chart draws the points in 3D itself, in SVG, from the same
 * place the renderer's camera starts: a picture a print and a page without
 * WebGL show too, which a drag or Shift with an arrow turns.
 *
 * **The table is the reading.** Every number is in it, and screen readers
 * read it. The `summary` part names the three measures and the number of
 * points, and describes the plot.
 *
 * **The plot is read by key.** It takes focus, named by `label` or the
 * caption. The left and right arrows move from point to point in the table's
 * order, Home and End go to the first and the last, and the up and down
 * arrows move among the measures the readout says first. The `live` part
 * says the point's row in words, and the renderer marks it. Shift with an
 * arrow turns the view, and Escape lets the point go.
 *
 * **A reading shows its row in a tooltip**, as on every chart: the point a
 * mouse or a pen rests on in the drawing, the point tapped, or the one the
 * keys move to, once a renderer has drawn.
 *
 * **Readings are sent as every chart sends them.** `helix-reading-change`
 * says each move of the reading, by pointer or key, and `helix-reading-press`
 * a point clicked, tapped, or pressed with Enter or Space, each with the row
 * of the table in `index`.
 *
 * **Keyboard.** The plot is one tab stop once it has points.
 *
 * | Key | What it does |
 * |---|---|
 * | Tab | Moves focus to the plot. |
 * | Right, Left | Moves to the next or the previous point, in the table's order. |
 * | Up, Down | Moves among the point's measures, which the readout says first. |
 * | Home, End | Moves to the first or the last point. |
 * | Shift with an arrow | Turns the view across, or tilts it up and down. |
 * | Enter, Space | Presses the point, which sends `helix-reading-press`. |
 * | Escape | Lets the point go. |
 *
 * @since 0.190.0
 * @status experimental
 * @category charts
 * @aliases 3D scatter chart, 3D scatter plot, Point cloud, Three-dimensional scatter
 * @documentation https://fusion.dev/helix/components/spatial-scatter-chart
 *
 * @slot - The renderer's box, which the 3D drawing is made in.
 * @slot empty - Content shown when the table has no points. Falls back to `empty-text`.
 * @slot loading - Content shown while `loading` is set and there are no points yet. Falls back to `loading-text`.
 *
 * @event {HelixPlotChangeEvent} helix-plot-change - The points or the point the keys rest on changed, which the renderer is told. It stays on the chart.
 * @event {HelixPlotTurnEvent} helix-plot-turn - Shift with an arrow asked the view to turn, by a step across or up.
 * @event {HelixReadingChangeEvent} helix-reading-change - The reading moved, or was put away: `index` is the row, or `-1` for none, with its `label` and the `pointerType` that moved it.
 * @event {HelixReadingPressEvent} helix-reading-press - A point was clicked, tapped, or pressed with Enter or Space, with the same detail as `helix-reading-change`.
 *
 * @csspart axis-name - A measure's name, along its edge of the box, in the chart's own drawing.
 * @csspart drawing - The chart's own drawing in SVG: the box, its grid and numbers, and the points.
 * @csspart drop-line - The line from a point straight down to the floor of the box, drawn under `drop-lines`, in its group's color.
 * @csspart empty - The words when the table has no points: the `empty` slot, falling back to `empty-text`.
 * @csspart fallback - The box the chart's own drawing fills, shown until a renderer has drawn and where none is connected. Hidden from screen readers.
 * @csspart grid - The box's edges and its grid at the ticks, in the chart's own drawing.
 * @csspart live - The readout: a polite live region that says the point the keys moved to. Hide it visually.
 * @csspart loading - The words while `loading` is set and there are no points.
 * @csspart mark - The invisible point the tooltip is anchored to, where the renderer draws the reading.
 * @csspart plot - The box the drawing fills, which takes focus to be read by key. It is named by the host's `aria-labelledby` or `aria-label`, then by `label`, then by the caption of the table.
 * @csspart point - One point of the chart's own drawing.
 * @csspart point-active - The point the pointer or the keys rest on, in the chart's own drawing. Set alongside `point`.
 * @csspart ring - The ring around the point the pointer or the keys rest on, drawn over every point.
 * @csspart sonify - The button that plays the chart as sound, under `sonify`.
 * @csspart summary - The three measures and the number of points, written as a sentence for screen readers, which describes the plot. Hide it visually.
 * @csspart table - The readings as a table, for a screen reader, rendered only where they were drawn from `data`, a page of them at a time past a few hundred. Hide it visually.
 * @csspart table-pages - Which readings a page of the `table` holds, and the buttons that show the previous and the next page, rendered only while it holds a page. Hide it visually.
 * @csspart tick - A number at a tick, along its edge of the box, in the chart's own drawing.
 * @csspart tooltip-anchor - The `Tooltip` element itself.
 * @csspart tooltip-arrow - The bubble's point, forwarded from `Tooltip`.
 * @csspart tooltip-arrow-bottom - The point while the bubble is below the reading, on its top edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-arrow-left - The point while the bubble is left of the reading, on its right edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-arrow-right - The point while the bubble is right of the reading, on its left edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-arrow-top - The point while the bubble is above the reading, on its bottom edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-cell - One column's name and value inside the tooltip.
 * @csspart tooltip-cell-current - The cell a chart's series keys rest on, which every chart's tooltip can mark. This chart marks none, since its readout says the measure. Set alongside `tooltip-cell`.
 * @csspart tooltip-label - The row's own name inside the tooltip.
 * @csspart tooltip-name - A column's name inside the tooltip.
 * @csspart tooltip-surface - The bubble, forwarded from `Tooltip`.
 * @csspart tooltip-surface-bottom - The bubble while it is below the reading. Set alongside `tooltip-surface`.
 * @csspart tooltip-surface-left - The bubble while it is left of the reading. Set alongside `tooltip-surface`.
 * @csspart tooltip-surface-right - The bubble while it is right of the reading. Set alongside `tooltip-surface`.
 * @csspart tooltip-surface-top - The bubble while it is above the reading. Set alongside `tooltip-surface`.
 * @csspart tooltip-value - A column's value inside the tooltip.
 *
 * @cssstate active - While a point is shown, under the pointer or the keys.
 * @cssstate drawn - While a renderer has drawn the points, and the chart's own drawing is hidden.
 * @cssstate empty - While the `empty` part stands in place of the points.
 * @cssstate loading - While the `loading` part stands in place of the points.
 */
@customElement('helix-headless-spatial-scatter-chart')
export class HelixHeadlessSpatialScatterChart extends MixinChartStatus(
  MixinChartSource(HelixElement),
) {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-spatial-scatter-chart': { emptyText: 'Keine Punkte' } })`.
   */
  static words = 'helix-spatial-scatter-chart'

  /**
   * Draws a line from each point straight down to the floor of the box, in
   * its group's color, so where a point stands across and in depth reads off
   * the floor's grid. A renderer draws them too.
   */
  @property({ attribute: 'drop-lines', reflect: true, type: Boolean })
  dropLines = false

  /** The column of text that puts each point in a group, by its heading. None by default. */
  @property({ attribute: 'group-by' })
  groupBy = ''

  /**
   * Draws no box: no edges, grid, numbers, or names, so the readings stand
   * alone and fill the plot, as a picture on a product's own page does. The
   * table, the summary, the tooltip, and the keys still carry every value,
   * and a renderer draws no box either.
   */
  @property({ attribute: 'no-box', reflect: true, type: Boolean })
  noBox = false

  /** The plot's name where the chart has none: no `aria-label`, `label`, or table caption. */
  @words
  @property({ attribute: 'plot-label' })
  plotLabel = '3D scatter chart'

  /**
   * The `summary` part's sentence. `{count}` is the number of points, written
   * in the locale, and `{x}`, `{y}`, and `{z}` are the three measures' names.
   */
  @words
  @property({ attribute: 'summary-label' })
  summaryLabel =
    '{count, plural, one {# point} other {# points}}: {x} across, {y} up, and {z} in depth.'

  /** Whether a renderer has drawn the points, which hides the chart's own drawing. */
  @state()
  private rendered = false

  /** Where the chart's own drawing is seen from, which a drag or Shift with an arrow turns. */
  @state()
  private camera: Camera = SPATIAL_VIEW

  /** A drag across the chart's own drawing, which turns its view. */
  private readonly plotRoom = new PlotRoomWatch(this)

  private readonly drag = new DragTurn(
    (next) => {
      this.camera = next(this.camera)
    },
    () => this.requestUpdate(),
  )

  /** Each point where the chart's own drawing put it, which the pointer finds. */
  private placed: Placed[] = []

  /** Where the renderer draws the reading, which the tooltip points at. */
  @state()
  private place: { x: number; y: number } | undefined

  /** The field last read, kept so a change of it can be told. */
  private last: PlotField | undefined = undefined

  /** The point the keys rested on last, so a change of it can be told. */
  private told = -1

  /** Carries a host `aria-labelledby` and `aria-describedby` to the plot. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('plot'),
  })

  /**
   * The table read as points, axes, and groups. **The first three numeric
   * columns are across, up, and in depth**, and a row lacking any of them is
   * left out. A renderer reads it.
   */
  get field(): PlotField {
    /* Read once for each table and grouping, which every render, key, and
       pointer asks for. */
    const rows = this.sourceRows
    if (this.memo?.rows !== rows || this.memo.groupBy !== this.groupBy) {
      this.memo = {
        field: fieldOf(rows, this.plottedColumns, this.groupBy),
        groupBy: this.groupBy,
        rows,
      }
    }
    return this.memo.field
  }

  /** The field last read, and what it was read from. */
  private memo: { field: PlotField; groupBy: string; rows: unknown } | undefined

  /** The point the keys or the pointer rest on, as its place in `field.points`, or `-1`. */
  get active(): number {
    return this.pointer.at
  }

  /** The number of points, which the keys walk. */
  override get readings(): number {
    return this.field.points.length
  }

  /**
   * Says whether a renderer has drawn the points, which hides the chart's
   * own drawing or shows it again. Called by the connector.
   */
  rendererDrawn(on = true): void {
    this.rendered = on
    this.toggleState('drawn', on)
  }

  /**
   * Puts the reading on the point at `index`, or lets it go with `-1`, as a
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

  override connectedCallback(): void {
    super.connectedCallback()
    /* The renderer finds the point under a pointer, which is a place in
       three dimensions, so the controller's search along one axis stays out.
       It still owns `at` and the keys. */
    this.pointer.axis = 'none'
    /* Sent with the row of the table, which is not the point's place among
       the points once a row lacking a number is left out. */
    this.pointer.onReading = (heard, detail) => {
      const point = this.field.points[detail.index]
      const told = {
        ...detail,
        index: point ? point.row : -1,
        label: point?.label ?? '',
      }
      this.dispatchEvent(
        heard === 'press' ? new HelixReadingPressEvent(told) : new HelixReadingChangeEvent(told),
      )
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* Told only on a change, so a renderer draws again only when it must:
       the field is read once for each table and grouping, so a new one is a
       change. */
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

  /** A mouse or a pen over the chart's own drawing puts the reading on the point nearest it. */
  private readonly onDrawingMove = (event: PointerEvent): void => {
    if (this.drag.move(event)) {
      return
    }
    if (event.pointerType === 'touch') {
      return
    }
    const drawing = event.currentTarget as SVGSVGElement
    this.requestActive(
      nearestTo(drawing, event, this.placed),
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
   * view: it shows the point nearest it until a tap lands elsewhere.
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
    const { points } = field
    const readable = points.length > 0
    const at = this.pointer.at
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
        ${this.renderLive(points, at)}
        ${this.renderTooltip(points[at]?.row)}
      </div>
      ${readable ? this.renderSummary(field) : this.renderStatus()}${this.renderSonify()}${this.renderTable()}`
  }

  /**
   * The points in 3D, in SVG: the box with its grid, numbers, and names, and
   * each point painted back to front, as the camera sees them. The chart's
   * own drawing, until a renderer has drawn and where none is connected.
   */
  private renderFallback(field: PlotField, at: number): TemplateResult {
    const view = wordsFitted(this.plotRoom.room, (words) =>
      boxView(field.axes, this.camera, [], this.noBox, words),
    )
    const places = field.points.map((point, index) => {
      const box: BoxPoint = [
        inBox(field.axes.x, point.x),
        inBox(field.axes.y, point.y),
        inBox(field.axes.z, point.z),
      ]
      return {
        depth: view.depth(box),
        foot: view.on([box[0], -1, box[2]]),
        index,
        point,
        ...view.on(box),
      }
    })
    this.placed = places
    const painted = [...places].sort((one, other) => one.depth - other.depth)
    const active = places[at]
    const bounds = this.drag.frame(
      this.noBox ? boundsOf(places, 0.1) : view.bounds,
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
      >${this.noBox ? nothing : drawBox(view)}${painted.map(
        (place) =>
          svg`${this.dropLines ? svg`<path d="M${shortNumber(place.x)} ${shortNumber(place.y)}L${shortNumber(place.foot.x)} ${shortNumber(place.foot.y)}" part="drop-line" style="--chart-series: var(--chart-series-${(place.point.groupIndex % SERIES) + 1})"></path>` : nothing}<circle cx=${place.x} cy=${place.y} part="point${place.index === at ? ' point-active' : ''}" r="0.045" style="--chart-series: var(--chart-series-${(place.point.groupIndex % SERIES) + 1})"></circle>`,
      )}${
        active
          ? svg`<circle cx=${active.x} cy=${active.y} part="ring" r="0.085"></circle><foreignObject height="0.001" overflow="visible" width="0.001" x=${active.x} y=${active.y}>${this.renderOwnTooltip(active.point.row)}</foreignObject>`
          : nothing
      }</svg>
    </div>`
  }

  /** The readout: the point's row in words, once the keys have moved to one. */
  private renderLive(points: readonly PlotPoint[], at: number): TemplateResult | typeof nothing {
    if (points.length === 0) {
      return nothing
    }
    const row = this.sourceRows[points[at]?.row ?? -1]
    const said =
      this.pointer.keyed && row
        ? spokenReading(
            row,
            this.pointer.column,
            (cell) => this.pointer.shows(cell),
            this.pointer.position,
          )
        : ''
    return html`<span aria-live="polite" part="live" role="status">${said}</span>`
  }

  /**
   * The reading's row in the tooltip, pointed at the point in the chart's
   * own drawing, which holds it at the point's place.
   */
  private renderOwnTooltip(row: number): TemplateResult | typeof nothing {
    if (this.rendered || !this.sourceRows[row]) {
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
  private renderSummary(field: PlotField): TemplateResult {
    const said = formatWords(this, 'summaryLabel', {
      count: field.points.length,
      x: field.axes.x.name,
      y: field.axes.y.name,
      z: field.axes.z.name,
    })
    return html`<p id="helix-chart-summary" part="summary">${said}</p>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-spatial-scatter-chart': HelixHeadlessSpatialScatterChart
  }
}
