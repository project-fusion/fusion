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
  type BoxPoint,
  boundsOf,
  boxView,
  DragTurn,
  drawBox,
  inBox,
  nearestTo,
  type Placed,
  SPATIAL_VIEW,
  shape,
  turned,
} from '../../spatial-scatter-chart/view.js'
import { levelOf, type SurfaceField, surfaceOf } from '../grid.js'

/**
 * Where the light comes from, in the box: from the left, above, and a little
 * in front, so a slope facing the upper left of the page reads lightest.
 */
const LIGHT: BoxPoint = (() => {
  const [x, y, z] = [-0.45, 1, 0.35]
  const length = Math.hypot(x, y, z)
  return [x / length, y / length, z / length]
})()

/** How much a face turned fully from the light is darkened, as a share of lightness. */
const SHADE = 0.3

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
 * `@fusion.dev/helix-plot`, given `threeSurfaceDriver` from
 * `@fusion.dev/helix-plot/three`, draws the surface in it with three.js,
 * shaded from low to high in the theme's colors. Until a renderer has drawn, and where
 * none is connected, the chart draws the surface in 3D itself, in SVG, from
 * the same place the renderer's camera starts: a picture a print and a page
 * without WebGL show too, which a drag or Shift with an arrow turns.
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
 * **A reading shows its row in a tooltip**, as on every chart: the place a
 * mouse or a pen rests on in the drawing, the place tapped, or the one the
 * keys move to, once a renderer has drawn. A place with no reading shows
 * none.
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
 * @since 0.190.0
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
 * @csspart axis-name - A measure's name, along its edge of the box, in the chart's own drawing.
 * @csspart contour - One contour line on the floor of the box, drawn under `contours`, at one height, colored along the ramp by it.
 * @csspart drawing - The chart's own drawing in SVG: the box, its grid and numbers, and the surface.
 * @csspart empty - The words when the table has no readings: the `empty` slot, falling back to `empty-text`.
 * @csspart face - One square of the surface between four readings, or a triangle where one is missing, shaded by its height and by which way it faces.
 * @csspart fallback - The box the chart's own drawing fills, shown until a renderer has drawn and where none is connected. Hidden from screen readers.
 * @csspart grid - The box's edges and its grid at the ticks, in the chart's own drawing.
 * @csspart live - The readout: a polite live region that says the place the keys moved to. Hide it visually.
 * @csspart loading - The words while `loading` is set and there are no readings.
 * @csspart mark - The invisible point the tooltip is anchored to, where the renderer draws the reading.
 * @csspart plot - The box the drawing fills, which takes focus to be read by key. It is named by the host's `aria-labelledby` or `aria-label`, then by `label`, then by the caption of the table.
 * @csspart ring - The ring around the reading the pointer or the keys rest on, drawn over the surface.
 * @csspart summary - The measures, the number of readings, and the range of heights, written as a sentence for screen readers, which describes the plot. Hide it visually.
 * @csspart table - The readings as a table, for a screen reader, rendered only where they were drawn from `data`. Hide it visually.
 * @csspart tick - A number at a tick, along its edge of the box, in the chart's own drawing.
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
 * @cssproperty --spatial-surface-chart-level - How high a face of the surface stands between the lowest reading and the highest, from 0 to 1: its corners' average. The component writes it on each face, and the stylesheet that colors the face along the ramp reads it.
 * @cssproperty --spatial-surface-chart-shade - How far a face of the surface turns from the light, as a share of lightness to take from its color, from 0 facing it to about 0.3. The component writes it on each face, and the stylesheet that shades the face reads it.
 *
 * @cssstate active - While a place is shown, under the pointer or the keys.
 * @cssstate drawn - While a renderer has drawn the surface, and the chart's own drawing is hidden.
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
   * Draws the surface's contour lines on the floor of the box, at each tick
   * of its height, in the ramp's colors, so its shape reads from above as on
   * a map. A renderer draws them too.
   */
  @property({ reflect: true, type: Boolean })
  contours = false

  /**
   * Draws no box: no edges, grid, numbers, or names, so the readings stand
   * alone and fill the plot, as a picture on a product's own page does. The
   * table, the summary, the tooltip, and the keys still carry every value,
   * and a renderer draws no box either.
   */
  @property({ attribute: 'no-box', reflect: true, type: Boolean })
  noBox = false

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

  /** Whether a renderer has drawn the surface, which hides the chart's own drawing. */
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

  /** Each reading where the chart's own drawing put it, which the pointer finds. */
  private placed: Placed[] = []

  /** Where the renderer draws the reading, which the tooltip points at. */
  @state()
  private place: { x: number; y: number } | undefined

  /** The field last told, kept so a change of it can be told. */
  private last: SurfaceField | undefined

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
    /* Read once for each table, which every render, key, and pointer asks
       for: read afresh each time, a surface of a few thousand readings spent
       most of a turn reading its table. */
    const rows = this.sourceRows
    if (this.memo?.rows !== rows) {
      this.memo = { field: surfaceOf(rows, this.plottedColumns), rows }
    }
    return this.memo.field
  }

  /** The field last read, and the rows it was read from. */
  private memo: { field: SurfaceField; rows: unknown } | undefined

  /** The place the keys or the pointer rest on, as its place in `field.cells`, or `-1`. */
  get active(): number {
    return this.pointer.at
  }

  /** The number of places on the grid, which the keys walk. */
  override get readings(): number {
    return this.field.cells.length
  }

  /**
   * Says whether a renderer has drawn the surface, which hides the chart's
   * own drawing or shows it again. Called by the connector.
   */
  rendererDrawn(on = true): void {
    this.rendered = on
    this.toggleState('drawn', on)
  }

  /**
   * Puts the reading on the place at `index`, or lets it go with `-1`, as a
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

  /** The reading a pointer event is over, as `onDrawingMove` finds it, or `-1`. */
  private placeAt(event: PointerEvent, reach?: number): number {
    const drawing = event.currentTarget as SVGSVGElement
    const face = (event.composedPath()[0] as Element | undefined)?.closest?.('[part="face"]')
    const corners = new Set(
      (face?.getAttribute('data-corners') ?? '').split(' ').filter(Boolean).map(Number),
    )
    if (corners.size > 0) {
      return nearestTo(
        drawing,
        event,
        this.placed.filter((place) => corners.has(place.index)),
        Number.POSITIVE_INFINITY,
      )
    }
    return nearestTo(drawing, event, this.placed, reach)
  }

  /**
   * A mouse or a pen over the chart's own drawing puts the reading on the
   * place nearest it: over a face, the face's nearest corner on the screen,
   * so any point of the surface finds a reading, and otherwise a place
   * within reach. The face under the pointer is the one in front, since the
   * faces are painted back to front.
   */
  private readonly onDrawingMove = (event: PointerEvent): void => {
    if (this.drag.move(event)) {
      return
    }
    if (event.pointerType === 'touch') {
      return
    }
    this.requestActive(this.placeAt(event), event.pointerType === 'pen' ? 'pen' : 'mouse')
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
   * view: it shows the place nearest it until a tap lands elsewhere.
   */
  private readonly onDrawingTap = (event: PointerEvent): void => {
    if (this.drag.up(event)) {
      return
    }
    if (event.pointerType === 'touch') {
      this.requestActive(this.placeAt(event, 24), 'touch')
    }
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
        ${this.renderTooltip(field.cells[at]?.row)}
      </div>
      ${readable ? this.renderSummary(field) : this.renderStatus()}${this.renderTable()}`
  }

  /**
   * The surface in 3D, in SVG: the box with its grid, numbers, and names, and
   * each square of the grid between four readings as a face, painted back to
   * front, colored by its height and shaded by which way it faces. A place
   * with no reading leaves a hole, and a square missing one corner is the
   * triangle of the other three. The chart's own drawing, until a renderer
   * has drawn and where none is connected.
   */
  private renderFallback(field: SurfaceField, at: number): TemplateResult {
    const view = boxView(field.axes, this.camera, [], this.noBox)
    const depths = field.depths.length
    const boxed = field.cells.map((cell): BoxPoint | undefined =>
      cell.value === undefined
        ? undefined
        : [
            inBox(field.axes.x, cell.x),
            inBox(field.axes.y, cell.value),
            inBox(field.axes.z, cell.z),
          ],
    )
    const places = boxed.flatMap((box, index) => (box ? [{ index, ...view.on(box) }] : []))
    this.placed = places
    const faces: Array<{
      corners: number[]
      depth: number
      level: number
      points: BoxPoint[]
      shade: number
    }> = []
    for (let across = 0; across + 1 < field.acrosses.length; across++) {
      for (let depth = 0; depth + 1 < depths; depth++) {
        const here = across * depths + depth
        const corners = [here, here + depths, here + depths + 1, here + 1].filter(
          (index) => boxed[index] !== undefined,
        )
        if (corners.length < 3) {
          continue
        }
        const points = corners.map((index) => boxed[index] as BoxPoint)
        faces.push({
          corners,
          depth: points.reduce((sum, point) => sum + view.depth(point), 0) / points.length,
          level:
            corners.reduce(
              (sum, index) => sum + (levelOf(field, field.cells[index] as never) ?? 0),
              0,
            ) / corners.length,
          points,
          shade: shadeOf(points),
        })
      }
    }
    faces.sort((one, other) => one.depth - other.depth)
    const active = places.find((place) => place.index === at)
    const row = field.cells[at]?.row
    const bounds = this.drag.frame(
      this.noBox ? boundsOf(places, 0.1) : view.bounds,
      view.on([0, 0, 0]),
    )
    const short = (value: number): number => Math.round(value * 1000) / 1000
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
      >${this.noBox ? nothing : drawBox(view)}${this.contours ? this.renderContours(field, view.on) : nothing}${faces.map(
        (face) =>
          svg`<path d=${shape(face.points.map((point) => view.on(point)))} data-corners=${face.corners.join(' ')} part="face" style="--spatial-surface-chart-level: ${short(face.level)}; --spatial-surface-chart-shade: ${short(face.shade)}"></path>`,
      )}${
        active
          ? svg`<circle cx=${active.x} cy=${active.y} part="ring" r="0.085"></circle><foreignObject height="0.001" overflow="visible" width="0.001" x=${active.x} y=${active.y}>${this.renderOwnTooltip(row)}</foreignObject>`
          : nothing
      }</svg>
    </div>`
  }

  /**
   * The contour lines on the floor of the box, one path for each height,
   * drawn under the surface so it stands over them.
   */
  private renderContours(
    field: SurfaceField,
    on: (point: BoxPoint) => { x: number; y: number },
  ): SVGTemplateResult[] {
    const { highest, lowest } = field
    const short = (value: number): number => Math.round(value * 1000) / 1000
    return field.contours.map((contour) => {
      const d = contour.segments
        .map(([from, to]) => {
          const [a, b] = [
            on([inBox(field.axes.x, from[0]), -1, inBox(field.axes.z, from[1])]),
            on([inBox(field.axes.x, to[0]), -1, inBox(field.axes.z, to[1])]),
          ]
          return `M${short(a.x)} ${short(a.y)}L${short(b.x)} ${short(b.y)}`
        })
        .join('')
      const level = highest === lowest ? 0.5 : (contour.level - lowest) / (highest - lowest)
      return svg`<path d=${d} part="contour" style="--spatial-surface-chart-level: ${short(level)}"></path>`
    })
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

  /**
   * The reading's row in the tooltip, pointed at its place in the chart's own
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

/**
 * How far a face turns from the light, as a share of lightness to take from
 * its color: none for a face toward the light, and `SHADE` for one turned
 * fully away. Its upward side counts, so a face seen from below is shaded as
 * the same slope seen from above.
 */
const shadeOf = (points: readonly BoxPoint[]): number => {
  const [a, b, c] = points as [BoxPoint, BoxPoint, BoxPoint]
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
  let n = [
    (u[1] as number) * (v[2] as number) - (u[2] as number) * (v[1] as number),
    (u[2] as number) * (v[0] as number) - (u[0] as number) * (v[2] as number),
    (u[0] as number) * (v[1] as number) - (u[1] as number) * (v[0] as number),
  ] as [number, number, number]
  if (n[1] < 0) {
    n = [-n[0], -n[1], -n[2]]
  }
  const length = Math.hypot(...n) || 1
  const lit = (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]) / length
  return Math.min(SHADE, Math.max(0, (1 - lit) * SHADE))
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-spatial-surface-chart': HelixHeadlessSpatialSurfaceChart
  }
}
