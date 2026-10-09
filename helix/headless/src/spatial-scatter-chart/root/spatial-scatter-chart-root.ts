import {
  AriaForwardController,
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
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import '../../tooltip/index.js'
import { along, fieldOf, type PlotField, type PlotPoint } from '../field.js'

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
 * `@fusion.dev/helix-plot` draws the points in it with three.js and keeps it
 * in step with the chart. Until a renderer has drawn, and where none is
 * connected, the chart draws the first two measures as a flat scatter, so
 * the page always shows the points.
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
 * @since 0.185.0
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
 * @csspart empty - The words when the table has no points: the `empty` slot, falling back to `empty-text`.
 * @csspart fallback - The flat scatter of the first two measures, drawn until a renderer has drawn and where none is connected. Hidden from screen readers.
 * @csspart live - The readout: a polite live region that says the point the keys moved to. Hide it visually.
 * @csspart loading - The words while `loading` is set and there are no points.
 * @csspart mark - The invisible point the tooltip is anchored to, where the renderer draws the reading.
 * @csspart plot - The box the drawing fills, which takes focus to be read by key. It is named by the host's `aria-labelledby` or `aria-label`, then by `label`, then by the caption of the table.
 * @csspart point - One point of the flat scatter, placed by percentage.
 * @csspart point-active - The point the keys rest on, in the flat scatter. Set alongside `point`.
 * @csspart summary - The three measures and the number of points, written as a sentence for screen readers, which describes the plot. Hide it visually.
 * @csspart table - The readings as a table, for a screen reader, rendered only where they were drawn from `data`. Hide it visually.
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
 * @cssstate active - While a point is shown, under the pointer or the keys.
 * @cssstate drawn - While a renderer has drawn the points, and the flat scatter is hidden.
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

  /** The column of text that puts each point in a group, by its heading. None by default. */
  @property({ attribute: 'group-by' })
  groupBy = ''

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

  /** Whether a renderer has drawn the points, which hides the flat scatter. */
  @state()
  private rendered = false

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
    return fieldOf(this.sourceRows, this.plottedColumns, this.groupBy)
  }

  /** The point the keys or the pointer rest on, as its place in `field.points`, or `-1`. */
  get active(): number {
    return this.pointer.at
  }

  /** The number of points, which the keys walk. */
  override get readings(): number {
    return this.field.points.length
  }

  /**
   * Says whether a renderer has drawn the points, which hides the flat
   * scatter or shows it again. Called by the connector.
   */
  drawn(on = true): void {
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
    /* Told only on a change, so a renderer draws again only when it must. */
    const field = this.field
    if (!this.last || JSON.stringify(field) !== JSON.stringify(this.last)) {
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

  /** Shift with an arrow asks the renderer to turn the view, and moves no reading. */
  private readonly onPlotKeydown = (event: KeyboardEvent): void => {
    const turn = TURNS[event.key]
    if (!event.shiftKey || !turn || event.altKey || event.ctrlKey || event.metaKey) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    this.dispatchEvent(new HelixPlotTurnEvent(turn))
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
      ${readable ? this.renderSummary(field) : this.renderStatus()}${this.renderTable()}`
  }

  /**
   * The first two measures as a flat scatter, across and up, for the page to
   * show until a renderer has drawn and where none is connected. Left to
   * right in every text direction, as a number line is.
   */
  private renderFallback(field: PlotField, at: number): TemplateResult {
    return html`<div
      aria-hidden="true"
      dir="ltr"
      ?hidden=${this.rendered}
      part="fallback"
    >${field.points.map(
      (point, index) => html`<span
          part="point${index === at ? ' point-active' : ''}"
          style="left: ${along(field.axes.x, point.x) * 100}%; top: ${(1 - along(field.axes.y, point.y)) * 100}%; --chart-series: var(--chart-series-${(point.groupIndex % SERIES) + 1})"
        ></span>`,
    )}</div>`
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
   * The reading's row in the tooltip every chart shows, pointed at where the
   * renderer draws it. Only once a renderer has drawn, since the flat
   * drawing is a stand-in.
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
