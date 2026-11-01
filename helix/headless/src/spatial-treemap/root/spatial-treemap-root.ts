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
  PlotRoomWatch,
  SPATIAL_VIEW,
  turned,
  wordsFitted,
} from '../../spatial-scatter-chart/view.js'
import {
  blocksDrawn,
  type DrawnBlock,
  paintOrder,
  type TreemapField,
  treemapOf,
} from '../blocks.js'

/** The arrow keys that turn the view while Shift is held, and which way each turns it. */
const TURNS: Record<string, { across: number; up: number }> = {
  ArrowDown: { across: 0, up: -1 },
  ArrowLeft: { across: -1, up: 0 },
  ArrowRight: { across: 1, up: 0 },
  ArrowUp: { across: 0, up: 1 },
}

/** How many series colors the theme has, after which the groups take them again. */
const SERIES = 24

/**
 * @summary A treemap drawn in three dimensions, each item a block whose area is its size and whose height is a second measure.
 *
 * @description
 * A 3D treemap shares a floor out among the rows of its table: **the first
 * numeric column is each block's size, and its share of the floor is in
 * proportion to it**. The second numeric column, where there is one, is each
 * block's height, from zero, so one block shows two measures: how large an
 * item is, and how it stands on another count, such as each service's
 * requests and its errors. `group-by` names a column of text, such as a team,
 * that gathers its rows into one part of the floor, in one color, and the
 * part is as large as their total.
 *
 * **Each part is laid out as near to square as its share allows**, so two
 * items compare by area, and the largest stand at the back left, where they
 * hide the least. With no height column the blocks stand as one thin slab, a
 * treemap seen in 3D.
 *
 * **Helix draws the frame, and the chart draws the blocks in 3D itself, in
 * SVG**: a picture a print and a page without WebGL show too, which a drag
 * or Shift with an arrow turns. Put a box inside the chart, and
 * `connectSpatialTreemap` from `@fusion.dev/helix-plot`, given
 * `threeTreemapDriver` from `@fusion.dev/helix-plot/three`, draws the blocks
 * in it with three.js, lit and in perspective.
 *
 * **The table is the reading.** Every number is in it, and screen readers
 * read it. The `summary` part names the number of items and groups and the
 * range of their sizes, and describes the plot.
 *
 * **The plot is read by key, in the table's order.** It takes focus, named
 * by `label` or the caption. The left and right arrows move from item to
 * item, the down and up arrows among the item's measures, which the readout
 * says first, and Home and End go to the first and the last item. Shift
 * with an arrow turns the view, and Escape lets the item go.
 *
 * **A reading shows its row in a tooltip**, as on every chart: the block a
 * mouse or a pen rests on, the block tapped, or the one the keys move to.
 *
 * **Readings are sent as every chart sends them.** `helix-reading-change`
 * says each move of the reading, and `helix-reading-press` a block clicked
 * or pressed with Enter or Space, each with the row of the table in `index`.
 *
 * **Keyboard.** The plot is one tab stop once it has readings.
 *
 * | Key | What it does |
 * |---|---|
 * | Tab | Moves focus to the plot. |
 * | Right, Left | Moves to the next or the previous item, in the table's order. |
 * | Down, Up | Moves among the item's measures, which the readout says first. |
 * | Home, End | Moves to the first or the last item. |
 * | Shift with an arrow | Turns the view across, or tilts it up and down. |
 * | Enter, Space | Presses the item, which sends `helix-reading-press`. |
 * | Escape | Lets the item go. |
 *
 * @since 0.199.0
 * @status experimental
 * @category charts
 * @aliases 3D treemap, Isometric treemap, Treemap in 3D, City map chart
 * @documentation https://fusion.dev/helix/components/spatial-treemap
 *
 * @slot - The renderer's box, which the 3D drawing is made in.
 * @slot empty - Content shown when the table has no readings. Falls back to `empty-text`.
 * @slot loading - Content shown while `loading` is set and there are no readings yet. Falls back to `loading-text`.
 *
 * @event {HelixPlotChangeEvent} helix-plot-change - The blocks or the block the keys rest on changed, which the renderer is told. It stays on the chart.
 * @event {HelixPlotTurnEvent} helix-plot-turn - Shift with an arrow asked the view to turn, by a step across or up.
 * @event {HelixReadingChangeEvent} helix-reading-change - The reading moved, or was put away: `index` is the row, or `-1` for none, with its `label` and the `pointerType` that moved it.
 * @event {HelixReadingPressEvent} helix-reading-press - A block was clicked or pressed with Enter or Space, with the same detail as `helix-reading-change`.
 *
 * @csspart axis-name - The height's name, along its edge of the box, in the chart's own drawing.
 * @csspart block - One block, its faces in its group's color.
 * @csspart block-active - The block the pointer or the keys rest on. Set alongside `block`.
 * @csspart drawing - The chart's own drawing in SVG: the box, its grid and numbers, and the blocks.
 * @csspart empty - The words when the table has no readings: the `empty` slot, falling back to `empty-text`.
 * @csspart face - One face of a block the view shows, shaded by which way it faces.
 * @csspart fallback - The box the chart's own drawing fills, shown until a renderer has drawn and where none is connected. Hidden from screen readers.
 * @csspart grid - The box's edges and its grid, in the chart's own drawing.
 * @csspart live - The readout: a polite live region that says the item the keys moved to. Hide it visually.
 * @csspart loading - The words while `loading` is set and there are no readings.
 * @csspart mark - The invisible point the tooltip is anchored to, where the renderer draws the reading.
 * @csspart plot - The box the drawing fills, which takes focus to be read by key. It is named by the host's `aria-labelledby` or `aria-label`, then by `label`, then by the caption of the table.
 * @csspart ring - The outline around the block the pointer or the keys rest on, painted after it, so the blocks in front of it cover it.
 * @csspart ring-behind - The same outline, faint and dashed, drawn over every block, so the part of the block the pointer or the keys rest on that others hide still shows.
 * @csspart sonify - The button that plays the chart as sound, under `sonify`.
 * @csspart summary - The number of items and groups and the range of their sizes, written as a sentence for screen readers, which describes the plot. Hide it visually.
 * @csspart table - The readings as a table, for a screen reader, rendered only where they were drawn from `data`, a page of them at a time past a few hundred. Hide it visually.
 * @csspart table-pages - Which readings a page of the `table` holds, and the buttons that show the previous and the next page, rendered only while it holds a page. Hide it visually.
 * @csspart tick - A height at a tick, along its edge of the box, in the chart's own drawing.
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
 * @cssproperty --spatial-treemap-shade - How far a block's face turns from the light, from 0 for its top. The component writes it on each face, and the stylesheet that shades the face reads it.
 *
 * @cssstate active - While a block is shown, under the pointer or the keys.
 * @cssstate drawn - While a renderer has drawn the blocks, and the chart's own drawing is hidden.
 * @cssstate empty - While the `empty` part stands in place of the readings.
 * @cssstate loading - While the `loading` part stands in place of the readings.
 */
@customElement('helix-headless-spatial-treemap')
export class HelixHeadlessSpatialTreemap extends MixinChartStatus(MixinChartSource(HelixElement)) {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-spatial-treemap': { emptyText: 'Keine Werte' } })`.
   */
  static words = 'helix-spatial-treemap'

  /** The column of text that gathers the rows into groups, by its heading. None by default. */
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
  plotLabel = '3D treemap'

  /**
   * The `summary` part's sentence. `{count}` and `{groups}` are the number
   * of items and groups, written in the locale, and `{low}` and `{high}` the
   * smallest and the largest size.
   */
  @words
  @property({ attribute: 'summary-label' })
  summaryLabel =
    '{count, plural, one {# item} other {# items}} in {groups, plural, one {# group} other {# groups}}, sized from {low} to {high}.'

  /** Whether a renderer has drawn the blocks, which hides the chart's own drawing. */
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

  /** Where the renderer draws the reading, which the tooltip points at. */
  @state()
  private place: { x: number; y: number } | undefined

  /** The field last told, kept so a change of it can be told. */
  private last: TreemapField | undefined

  /** The block the keys rested on last, so a change of it can be told. */
  private told = -1

  /** Carries a host `aria-labelledby` and `aria-describedby` to the plot. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('plot'),
  })

  /**
   * The table read as blocks. **The first numeric column is each block's
   * size, and the second its height.** A renderer reads it.
   */
  get field(): TreemapField {
    const rows = this.sourceRows
    const columns = this.plottedColumns
    if (
      this.memo?.rows !== rows ||
      this.memo.columns !== columns ||
      this.memo.groupBy !== this.groupBy
    ) {
      this.memo = {
        columns,
        field: treemapOf(rows, columns, this.groupBy),
        groupBy: this.groupBy,
        rows,
      }
    }
    return this.memo.field
  }

  /** The field last read, and the rows, columns, and group column it was read from. */
  private memo:
    | { columns: unknown; field: TreemapField; groupBy: string; rows: unknown }
    | undefined

  /** The block the keys or the pointer rest on, as its place in `field.blocks`, or `-1`. */
  get active(): number {
    return this.pointer.at
  }

  /** The number of blocks, which the keys walk. */
  override get readings(): number {
    return this.field.blocks.length
  }

  /**
   * Says whether a renderer has drawn the blocks, which hides the chart's own
   * drawing or shows it again. Called by the connector.
   */
  rendererDrawn(on = true): void {
    this.rendered = on
    this.toggleState('drawn', on)
  }

  /**
   * Puts the reading on the block at `index`, or lets it go with `-1`, as a
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
    /* The block under a pointer is found by what the pointer is over, so the
       controller's search along one axis stays out, and the keys walk the
       table's order. */
    this.pointer.axis = 'none'
    this.pointer.onReading = (heard, detail) => {
      const block = this.field.blocks[detail.index]
      const told = { ...detail, index: block?.row ?? -1, label: block?.label ?? '' }
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

  /** The block a pointer event is over, or `-1`: the one in front, since the blocks are painted back to front. */
  private blockAt(event: PointerEvent): number {
    const block = (event.composedPath()[0] as Element | undefined)?.closest?.('[data-index]')
    const index = Number(block?.getAttribute('data-index') ?? -1)
    return Number.isInteger(index) ? index : -1
  }

  /** A mouse or a pen over the chart's own drawing puts the reading on the block it rests on. */
  private readonly onDrawingMove = (event: PointerEvent): void => {
    if (this.drag.move(event)) {
      return
    }
    if (event.pointerType === 'touch') {
      return
    }
    this.requestActive(this.blockAt(event), event.pointerType === 'pen' ? 'pen' : 'mouse')
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
   * view: it shows the block under it until a tap lands elsewhere.
   */
  private readonly onDrawingTap = (event: PointerEvent): void => {
    if (this.drag.up(event)) {
      return
    }
    if (event.pointerType === 'touch') {
      this.requestActive(this.blockAt(event), 'touch')
    }
  }

  protected override render(): TemplateResult {
    const field = this.field
    const readable = field.blocks.length > 0
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
        ${this.renderTooltip(field.blocks[at]?.row)}
      </div>
      ${readable ? this.renderSummary(field) : this.renderStatus()}${this.renderSonify()}${this.renderTable()}`
  }

  /**
   * The blocks in 3D, in SVG: the box with its height's grid and numbers, and
   * each block on its part of the floor, standing from zero to its height,
   * painted back to front, in its group's color and shaded by which way each
   * face turns. The chart's own drawing, until a renderer has drawn and where
   * none is connected.
   */
  private renderFallback(field: TreemapField, at: number): TemplateResult {
    const view = wordsFitted(this.plotRoom.room, (words) =>
      boxView(field.axes, this.camera, [], this.noBox, words),
    )
    const blocks = blocksDrawn(field, view.projection)
    const active = blocks[at]
    const bounds = this.drag.frame(
      this.noBox
        ? boundsOf(
            blocks.flatMap((block) => block.corners),
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
      >${this.noBox ? nothing : drawBox(view)}${paintOrder(view.projection, blocks).map(
        (block) =>
          /* The ring straight after its block, so the blocks in front cover
             it as they cover the block: drawn over them all, it traced their
             faces and read as theirs. */
          svg`${this.renderBlock(field, block, at)}${block === active ? svg`<path d=${active.drawn.outline} part="ring"></path>` : nothing}`,
      )}${
        /* Over everything, faint and dashed, so a block the keys reach behind
           others is still found: where it shows, the ring above covers it. */
        active
          ? svg`<path d=${active.drawn.outline} part="ring-behind"></path><foreignObject height="0.001" overflow="visible" width="0.001" x=${active.drawn.peak.x} y=${active.drawn.peak.y}>${this.renderOwnTooltip(field.blocks[at]?.row)}</foreignObject>`
          : nothing
      }</svg>
    </div>`
  }

  /** One block, its faces in its group's color, each shaded by which way it faces. */
  private renderBlock(field: TreemapField, block: DrawnBlock, at: number): SVGTemplateResult {
    const group = field.blocks[block.index]?.groupIndex ?? 0
    const short = (value: number): number => Math.round(value * 1000) / 1000
    return svg`<g data-index=${block.index} part="block${block.index === at ? ' block-active' : ''}" style="--chart-series: var(--chart-series-${(group % SERIES) + 1})">${block.drawn.faces.map((face) => svg`<path d=${face.d} part="face" style="--spatial-treemap-shade: ${short(face.darken)}"></path>`)}</g>`
  }

  /** The readout: the item's row in words, once the keys have moved to one. */
  private renderLive(field: TreemapField, at: number): TemplateResult {
    const row = this.sourceRows[field.blocks[at]?.row ?? -1]
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
   * The reading's row in the tooltip, pointed at its block in the chart's own
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
   * chart's own drawing holds the tooltip at the block.
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
  private renderSummary(field: TreemapField): TemplateResult {
    const sizes = field.blocks.map((block) => block.size)
    const said = formatWords(this, 'summaryLabel', {
      count: field.blocks.length,
      groups: field.groups.length,
      high: Math.max(...sizes),
      low: Math.min(...sizes),
    })
    return html`<p id="helix-chart-summary" part="summary">${said}</p>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-spatial-treemap': HelixHeadlessSpatialTreemap
  }
}
