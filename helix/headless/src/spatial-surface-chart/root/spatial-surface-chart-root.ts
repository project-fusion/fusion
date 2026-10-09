import {
  AriaForwardController,
  CHART_PLOT,
  customElement,
  formatWords,
  HelixElement,
  HelixPlotChangeEvent,
  HelixPlotTurnEvent,
  HelixReadingChangeEvent,
  HelixReadingPressEvent,
  MixinChartSource,
  MixinChartStatus,
  spokenReading,
  words,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { levelOf, type SurfaceField, surfaceOf } from '../grid.js'

/** The arrow keys that turn the view while Shift is held, and which way each turns it. */
const TURNS: Record<string, { across: number; up: number }> = {
  ArrowDown: { across: 0, up: -1 },
  ArrowLeft: { across: -1, up: 0 },
  ArrowRight: { across: 1, up: 0 },
  ArrowUp: { across: 0, up: 1 },
}

/**
 * @summary A chart that draws a height over a grid as a surface in three dimensions, for a measure that varies over two others.
 *
 * @description
 * A 3D surface chart shows how one measure varies over two others, such as
 * load by hour and by day. Each row of the table is one reading: **the
 * first numeric column is across, the second is in depth, and the third is
 * the height.** The readings make a grid from every distinct place across
 * and in depth, and a place with no reading is left open.
 *
 * **Helix draws the frame, and a renderer draws the surface in 3D.** Put a
 * box for the renderer inside the chart, and `connectSpatialSurfaceChart` from
 * `@fusion.dev/helix-plot` draws the surface in it with three.js, shaded from
 * low to high in the theme's colors. Until a renderer has drawn, and where
 * none is connected, the chart draws the grid flat, each cell as dark as its
 * height, as a heatmap does.
 *
 * **The table is the reading.** Every number is in it, and screen readers
 * read it. The `summary` part names the measures, the number of readings,
 * and the range of heights, and describes the plot.
 *
 * **The plot is read by key, across and in depth.** It takes focus, named by
 * `label` or the caption. The left and right arrows move across, the down
 * and up arrows move in depth, forward and back, and Home and End go to the
 * first and the last place. The `live` part says the reading at the place in
 * words, and the renderer marks it. Shift with an arrow turns the view, and
 * Escape lets the place go.
 *
 * **Readings are sent as every chart sends them.** `helix-reading-change`
 * says each move of the reading, and `helix-reading-press` a place clicked or
 * pressed with Enter or Space, each with the row of the table in `index`, or
 * `-1` for a place with no reading.
 *
 * **Keyboard.** The plot is one tab stop once it has readings.
 *
 * | Key | What it does |
 * |---|---|
 * | Tab | Moves focus to the plot. |
 * | Right, Left | Moves across to the next or the previous place. |
 * | Down, Up | Moves in depth to the next or the previous place. |
 * | Home, End | Moves to the first or the last place. |
 * | Shift with an arrow | Turns the view across, or tilts it up and down. |
 * | Enter, Space | Presses the place, which sends `helix-reading-press`. |
 * | Escape | Lets the place go. |
 *
 * @since 0.185.0
 * @status experimental
 * @category charts
 * @aliases 3D surface chart, 3D surface plot, Surface chart, Height map, Terrain chart
 * @documentation https://fusion.dev/helix/components/spatial-surface-chart
 *
 * @slot - The renderer's box, which the 3D drawing is made in.
 * @slot empty - Content shown when the table has no readings. Falls back to `empty-text`.
 * @slot loading - Content shown while `loading` is set and there are no readings yet. Falls back to `loading-text`.
 *
 * @event {HelixPlotChangeEvent} helix-plot-change - The readings or the place the keys rest on changed, which the renderer is told. It stays on the chart.
 * @event {HelixPlotTurnEvent} helix-plot-turn - Shift with an arrow asked the view to turn, by a step across or up.
 * @event {HelixReadingChangeEvent} helix-reading-change - The reading moved, or was put away: `index` is the row, or `-1` for none or a place with no reading, with its `label` and the `pointerType` that moved it.
 * @event {HelixReadingPressEvent} helix-reading-press - A place was clicked or pressed with Enter or Space, with the same detail as `helix-reading-change`.
 *
 * @csspart cell - One place of the flat grid, as dark as its height.
 * @csspart cell-active - The place the keys rest on, in the flat grid. Set alongside `cell`.
 * @csspart empty - The words when the table has no readings: the `empty` slot, falling back to `empty-text`.
 * @csspart fallback - The flat grid of heights, drawn until a renderer has drawn and where none is connected. Hidden from screen readers.
 * @csspart live - The readout: a polite live region that says the place the keys moved to. Hide it visually.
 * @csspart loading - The words while `loading` is set and there are no readings.
 * @csspart plot - The box the drawing fills, which takes focus to be read by key. It is named by the host's `aria-labelledby` or `aria-label`, then by `label`, then by the caption of the table.
 * @csspart summary - The measures, the number of readings, and the range of heights, written as a sentence for screen readers, which describes the plot. Hide it visually.
 * @csspart table - The readings as a table, for a screen reader, rendered only where they were drawn from `data`. Hide it visually.
 *
 * @cssproperty --spatial-surface-chart-columns - How many places across the flat grid has. The component writes it on the grid, and the stylesheet that lays the grid out reads it.
 * @cssproperty --spatial-surface-chart-level - How high a place's reading stands between the lowest and the highest, from 0 to 1. The component writes it on each place with a reading, and the stylesheet that shades the place reads it.
 *
 * @cssstate active - While a place is shown, under the pointer or the keys.
 * @cssstate drawn - While a renderer has drawn the surface, and the flat grid is hidden.
 * @cssstate empty - While the `empty` part stands in place of the readings.
 * @cssstate loading - While the `loading` part stands in place of the readings.
 */
@customElement('helix-headless-spatial-surface-chart')
export class HelixHeadlessSpatialSurfaceChart extends MixinChartStatus(
  MixinChartSource(HelixElement),
) {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-spatial-surface-chart': { emptyText: 'Keine Werte' } })`.
   */
  static words = 'helix-spatial-surface-chart'

  /**
   * What the readout says for a place with no reading. `{x}` and `{z}` are
   * the place's numbers across and in depth, and `{across}` and `{depth}`
   * the two measures' names.
   */
  @words
  @property({ attribute: 'open-label' })
  openLabel = '{across} {x}, {depth} {z}: no reading'

  /** The plot's name where the chart has none: no `aria-label`, `label`, or table caption. */
  @words
  @property({ attribute: 'plot-label' })
  plotLabel = '3D surface chart'

  /**
   * The `summary` part's sentence. `{count}` is the number of readings,
   * written in the locale, `{x}`, `{z}`, and `{y}` are the measures across,
   * in depth, and up, and `{low}` and `{high}` the lowest and the highest
   * reading.
   */
  @words
  @property({ attribute: 'summary-label' })
  summaryLabel =
    '{count, plural, one {# reading} other {# readings}} of {y} over {x} and {z}, from {low} to {high}.'

  /** Whether a renderer has drawn the surface, which hides the flat grid. */
  @state()
  private rendered = false

  /** The field last read, kept so a change of it can be told. */
  private last = ''

  /** The place the keys rested on last, so a change of it can be told. */
  private told = -1

  /** Carries a host `aria-labelledby` and `aria-describedby` to the plot. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('plot'),
  })

  /**
   * The table read as a grid of heights. **The first numeric column is
   * across, the second is in depth, and the third is the height.** A
   * renderer reads it.
   */
  get field(): SurfaceField {
    return surfaceOf(this.sourceRows, this.plottedColumns)
  }

  /** The place the keys or the pointer rest on, as its place in `field.cells`, or `-1`. */
  get active(): number {
    return this.pointer.at
  }

  /** The number of places on the grid, which the keys walk. */
  override get readings(): number {
    return this.field.cells.length
  }

  /**
   * Says whether a renderer has drawn the surface, which hides the flat grid
   * or shows it again. Called by the connector.
   */
  drawn(on = true): void {
    this.rendered = on
    this.toggleState('drawn', on)
  }

  /**
   * Puts the keys' reading on the place at `index`, or lets it go with `-1`,
   * as a press in the renderer's drawing does. Called by the connector.
   */
  requestActive(index: number): void {
    this.pointer.set(index)
  }

  /**
   * Tells the keys how many places stand in depth for each place across, so
   * the up and down arrows move in depth and the left and right arrows
   * across. Here rather than in `updated`, since the server calls this one.
   */
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed)
    this.pointer.grid = Math.max(1, this.field.depths.length)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* The renderer finds the place under a pointer, which is in three
       dimensions, so the controller's search along one axis stays out. */
    this.pointer.axis = 'none'
    this.pointer.onReading = (heard, detail) => {
      const cell = this.field.cells[detail.index]
      const told = { ...detail, index: cell?.row ?? -1, label: cell?.label ?? '' }
      this.dispatchEvent(
        heard === 'press' ? new HelixReadingPressEvent(told) : new HelixReadingChangeEvent(told),
      )
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* Told only on a change, so a renderer draws again only when it must. */
    const field = JSON.stringify(this.field)
    if (field !== this.last) {
      this.last = field
      this.dispatchEvent(new HelixPlotChangeEvent({ kind: 'data' }))
    }
    if (this.pointer.at !== this.told) {
      this.told = this.pointer.at
      this.dispatchEvent(new HelixPlotChangeEvent({ kind: 'focus' }))
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
    const readable = field.readings > 0
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
        ${readable ? this.renderLive(field, at) : nothing}
      </div>
      ${readable ? this.renderSummary(field) : this.renderStatus()}${this.renderTable()}`
  }

  /**
   * The grid drawn flat, each place as dark as its height, as a heatmap
   * draws it: across from left to right, and in depth from the top down, so
   * it is the surface seen from above with its first place in depth at the
   * back, as the renderer first shows it, and the down arrow moves down it.
   * Left to right in every text direction, as a number line is.
   */
  private renderFallback(field: SurfaceField, at: number): TemplateResult {
    const depths = field.depths.length
    const order = field.depths.flatMap((_, depth) =>
      field.acrosses.map((_, across) => across * depths + depth),
    )
    return html`<div
      aria-hidden="true"
      dir="ltr"
      ?hidden=${this.rendered}
      part="fallback"
      style="--spatial-surface-chart-columns: ${field.acrosses.length}"
    >${order.map((index) => {
      const cell = field.cells[index]
      const level = cell ? levelOf(field, cell) : undefined
      return html`<span
        part="cell${index === at ? ' cell-active' : ''}"
        style=${level === undefined ? nothing : `--spatial-surface-chart-level: ${Math.round(level * 1000) / 1000}`}
      ></span>`
    })}</div>`
  }

  /** The readout: the reading at the place in words, once the keys have moved to one. */
  private renderLive(field: SurfaceField, at: number): TemplateResult {
    const cell = field.cells[at]
    const row = cell?.row === undefined ? undefined : this.sourceRows[cell.row]
    let said = ''
    if (this.pointer.keyed && cell) {
      said = row
        ? spokenReading(
            row,
            this.pointer.column,
            (one) => this.pointer.shows(one),
            this.pointer.position,
          )
        : formatWords(this, 'openLabel', {
            across: field.axes.x.name,
            depth: field.axes.z.name,
            x: cell.x,
            z: cell.z,
          })
    }
    return html`<span aria-live="polite" part="live" role="status">${said}</span>`
  }

  /** What the plot shows, in a sentence, which describes the plot. */
  private renderSummary(field: SurfaceField): TemplateResult {
    const values = field.cells.flatMap((cell) => (cell.value === undefined ? [] : [cell.value]))
    const said = formatWords(this, 'summaryLabel', {
      count: field.readings,
      high: Math.max(...values),
      low: Math.min(...values),
      x: field.axes.x.name,
      y: field.axes.y.name,
      z: field.axes.z.name,
    })
    return html`<p id="helix-chart-summary" part="summary">${said}</p>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-spatial-surface-chart': HelixHeadlessSpatialSurfaceChart
  }
}
