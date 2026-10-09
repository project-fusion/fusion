import {
  type Camera,
  CHART_PLOT,
  commaList,
  customElement,
  drawTooltip,
  HelixPlotChangeEvent,
  HelixPlotTurnEvent,
  ISOMETRIC,
  isRtl,
  MIRROR_RULE,
  spokenReading,
  writtenList,
  writtenNumbers,
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
import { fits, toneOf } from '../../heatmap/root/buckets.js'
import { HelixHeadlessHeatmap } from '../../heatmap/root/heatmap-root.js'
import { DragTurn, turned } from '../../spatial-scatter-chart/view.js'
import {
  ACROSS,
  type Base,
  heightsOf,
  highestOf,
  type LabelSize,
  labelPlaces,
  type Point,
  type Prism,
  type Relief,
  reliefOf,
} from '../projection.js'

/** How far a label stands below what it clears, in pixels. */
const LABEL_GAP = 4

/** Where a renderer draws the front edge's two ends, and the corners of the box round the relief. */
type DrawnCorners = { end: Point; outline?: Point[]; start: Point }

/** The arrow keys that turn a renderer's view while Shift is held, and which way each turns it. */
const TURNS: Record<string, { across: number; up: number }> = {
  ArrowDown: { across: 0, up: -1 },
  ArrowLeft: { across: -1, up: 0 },
  ArrowRight: { across: 1, up: 0 },
  ArrowUp: { across: 0, up: 1 },
}

/**
 * @summary A heatmap drawn as a relief, where each reading stands as tall as its value.
 *
 * @description
 * The same strip as `Heatmap`, seen from above at an angle. Each reading is a
 * prism: its top face takes the cell's tone, and its height repeats the value,
 * measured from zero against the highest reading in the table. `rows="7"`
 * makes a contribution graph, with each week a column running down to the
 * right.
 *
 * **The height says what the tone says.** Read the exact value from the tooltip
 * or the table, and compare readings by tone. A tall reading at the front can
 * hide a short one behind it, so the newest column stands at the front, where
 * nothing covers it.
 *
 * **Everything else is `Heatmap`.** The table named by `for`, the tones and
 * thresholds, the keys, the tooltip, the overview, `selection-mode`, and the
 * events all work as they do there. The class extends the headless heatmap,
 * and its own entry point carries the drawing, so a page using only `Heatmap`
 * loads none of it.
 *
 * **It was `helix-isometric-heatmap` until 0.190.0**, and
 * `helix-headless-isometric-heatmap` in the headless tier. The old tags are
 * gone, and so are the `--isometric-heatmap-*` hooks, which are
 * `--spatial-heatmap-*`, and the words key, which is `helix-spatial-heatmap`.
 * The two shade hooks now take a step of lightness, such as `0.07`, where they
 * took a percentage mixed toward black. Every attribute, part, and event kept
 * its name.
 *
 * **`flat` lays every prism down** at no height, which leaves the tones on a
 * plane at the same angle.
 *
 * **The prisms stand on a slab**, the `base`, which reaches a little past the
 * grid, so the relief reads as one object. The `start` and `end` slots name
 * the two ends of the front edge, the long edge nearer the reader, which is
 * the strip's first and last column. The component measures where each label
 * stands under its corner, clear of the drawing, and writes it on the label as
 * `--spatial-heatmap-label-x` and `--spatial-heatmap-label-y`. A renderer
 * tells the chart where it draws those corners, so the labels stand at them
 * there too, and follow them as the view turns.
 *
 * **`gap` and `min-cell` set the smallest cell.** The drawing scales as a
 * whole, so a wider box draws larger cells and the gap grows with them. A box
 * too narrow for every column at `min-cell` draws the newest that fit.
 *
 * **The drawing is SVG and holds still.** It scales with its box through its
 * `viewBox`, needs no WebGL, and has no motion to pause. A drag turns it and
 * tilts it, and Shift with an arrow turns it a step, from the isometric view
 * it starts at.
 * **Under `selection-mode`, the prisms are painted back to front for the
 * view, and the grid's rows and cells stand beside them in the table's
 * order**, holding no drawing of their own, so a turned view paints
 * correctly and a screen reader still reads the grid in order.
 *
 * **A renderer can draw it in 3D instead.** Put a box for it in the
 * `renderer` slot, and `connectSpatialHeatmap` from `@fusion.dev/helix-plot`,
 * given `threeHeatmapDriver` from `@fusion.dev/helix-plot/three`, draws the
 * prisms in it with three.js, lit, in the same tones, in a view
 * that drags round and zooms. The chart publishes its readings in `field`,
 * and its own drawing stays under the renderer's, unseen, where a screen
 * reader and the keys still reach it. Shift with an arrow turns the view,
 * except under `selection-mode="multiple"`, where it selects.
 *
 * **Keyboard.** The keys are `Heatmap`'s. Down moves to the next reading in a
 * column, drawn down to the left, and Right to the same reading in the next
 * column, drawn down to the right.
 *
 * | Key | What it does |
 * |---|---|
 * | Tab | Moves focus to the strip and shows the first cell. |
 * | Down, Up | Moves to the next or the previous cell. |
 * | Right, Left | Moves a column on or back, a week with `rows="7"`. On a right-to-left page, Left moves on. |
 * | Home, End | Moves to the first or the last cell. |
 * | Page Down, Page Up | Moves a month on or back where the rows carry dates, and four columns otherwise. |
 * | Enter, Space | Presses the cell, which sends `helix-reading-press`, and selects it or lets it go under `selection-mode`. |
 * | Shift with an arrow, Home, End, Page Up or Page Down | Selects every cell from the last one pressed to where the key went, under `selection-mode="multiple"`. |
 * | Shift with an arrow | Turns the view a step, or a renderer's where one is connected, except under `selection-mode="multiple"`. |
 * | Escape | Puts the cell's tooltip away. |
 *
 * @since 0.190.0
 * @status experimental
 * @category charts
 * @aliases Isometric heatmap, Isometric chart, 3D heatmap, Relief chart, Isometric contribution graph
 * @documentation https://fusion.dev/helix/components/spatial-heatmap
 *
 * @slot renderer - The renderer's box, which a 3D drawing is made in, over the chart's own.
 *
 * @event {HelixPlotChangeEvent} helix-plot-change - The readings drawn or the reading the keys rest on changed, which a renderer is told. It stays on the chart.
 * @event {HelixPlotTurnEvent} helix-plot-turn - Shift with an arrow asked a renderer's view to turn, by a step across or up.
 *
 * @csspart base - The slab the prisms stand on: a group holding its top and its two sides. Hidden from screen readers.
 * @csspart base-left - The slab's side toward the viewer at the lower left, under the strip's last row.
 * @csspart base-right - The slab's side toward the viewer at the lower right, under the newest column.
 * @csspart base-top - The slab's top, which is the floor the prisms stand on.
 * @csspart cell - One reading drawn as a prism: a group holding the faces the view shows. Under `selection-mode` it is the picture of a grid cell, hidden from screen readers.
 * @csspart drawing - The SVG every prism is drawn in. It is mirrored on a right-to-left page.
 * @csspart left-face - The side of a prism facing the light more: from the isometric view, the side toward the next row, drawn at its lower left. Left out where the view shows no side.
 * @csspart right-face - The side of a prism facing the light less: from the isometric view, the side toward the next column, drawn at its lower right. Left out where the view shows one side or none.
 * @csspart row - A column of the strip, which a grid reads as a row, under `selection-mode`. It holds the column's grid cells, which draw nothing: the prisms are painted apart, in the order the view needs.
 * @csspart strip - The box the drawing fills, which takes focus to be read by key. It is named by the host's `aria-labelledby` or `aria-label`, then by `label`, then by the caption of the table.
 * @csspart top-face - The top of a prism, which carries the reading's tone.
 *
 * @cssproperty --spatial-heatmap-label-x - Where the `start` or the `end` label stands clear of the drawing, from the footer's inline start, in pixels. The component measures it and writes it on the label, with `data-placed`, as the view turns.
 * @cssproperty --spatial-heatmap-label-y - Where the `start` or the `end` label stands clear of the drawing, from the footer's top, in pixels. The component measures it and writes it on the label, with `data-placed`, as the view turns.
 * @cssproperty --spatial-heatmap-span - How many cells the drawing spans across: its columns and its rows together. The component writes it on the strip, and a stylesheet that caps the cell size reads it.
 *
 * @cssstate drawn - While a renderer has drawn the relief, and the chart's own drawing stays unseen under it.
 */
@customElement('helix-headless-spatial-heatmap')
export class HelixHeadlessSpatialHeatmap extends HelixHeadlessHeatmap {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-spatial-heatmap': { emptyText: 'Keine Werte' } })`.
   */
  static override words = 'helix-spatial-heatmap'

  protected static override markRules = [MIRROR_RULE]

  /**
   * Draws every prism at no height, so the tones lie on a plane.
   */
  @property({ type: Boolean })
  flat = false

  /**
   * How tall the highest reading stands, in cells. Every other reading stands
   * at its share of it.
   */
  @property({ type: Number })
  relief = 2

  /** The prisms drawn on the last render, which the tooltip is placed against. */
  private shown: Relief | undefined = undefined

  /** Where the chart's own drawing is seen from, which a drag or Shift with an arrow turns. */
  @state()
  private camera: Camera = ISOMETRIC

  /** What places the first and last labels again when one of them, or the footer, changes size. */
  private labelSizes: ResizeObserver | undefined = undefined

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.labelSizes?.disconnect()
    this.labelSizes = undefined
  }

  /** A drag across the chart's own drawing, which turns its view. */
  private readonly drag = new DragTurn(
    (next) => {
      this.camera = next(this.camera)
    },
    () => this.requestUpdate(),
  )

  private readonly onDrawingDown = (event: PointerEvent): void => {
    this.drag.down(event)
  }

  private readonly onDrawingMove = (event: PointerEvent): void => {
    this.drag.move(event)
  }

  private readonly onDrawingUp = (event: PointerEvent): void => {
    this.drag.up(event)
  }

  /** A tap shows the prism under it, unless the touch was a drag, which turned the view. */
  private readonly onStripUp = (event: PointerEvent): void => {
    if (!this.drag.dragged) {
      this.onPointerUp(event)
    }
  }

  /** A pointer passing over a prism shows it, unless it is turning the view. */
  private readonly onPrismOver = (event: PointerEvent): void => {
    if (!this.drag.moving) {
      this.onPointerOver(event)
    }
  }

  /** Whether a renderer has drawn the relief, which its own drawing then stays under. */
  @state()
  private rendered = false

  /** Where the renderer draws the reading, which the tooltip points at. */
  @state()
  private place: { x: number; y: number } | undefined

  /** Where the renderer draws the two ends of the front edge, which the first and last labels stand at. */
  @state()
  private corners: DrawnCorners | undefined

  /** The field last told, and the reading, so a renderer is told of a change only. */
  private told = { at: -1, field: '' }

  /**
   * What a renderer draws: every reading drawn, down each column and then
   * across, with its place on the grid, its height in cells, and its tone.
   */
  get field(): {
    cells: Array<{
      column: number
      height: number
      label: string
      row: number
      tone?: string | undefined
    }>
    columns: number
    rows: number
  } {
    const cells = this.drawn
    const rows = this.rowCount
    const bounds = writtenNumbers(this.thresholds)
    const palette = writtenList(this.tones)
    const tallest = this.flat ? 0 : Math.max(0, this.relief || 0)
    const heights = heightsOf(
      cells.map((point) => point.value),
      highestOf(this.points.map((point) => point.value)),
      tallest,
    )
    const first = this.points.length - cells.length
    return {
      cells: cells.map((cell, index) => ({
        column: Math.floor(index / rows),
        height: heights[index] ?? 0,
        label: this.sourceRows[first + index]?.label ?? '',
        row: index % rows,
        tone: toneOf(cell, bounds, palette),
      })),
      columns: Math.ceil(cells.length / rows),
      rows: Math.min(rows, cells.length),
    }
  }

  /** The reading the pointer or the keys rest on, as its place in `field.cells`, or `-1`. */
  get active(): number {
    return this.pointer.at
  }

  /**
   * Says whether a renderer has drawn the relief, which its own drawing then
   * stays under, or shows it again. Called by the connector.
   */
  rendererDrawn(on = true): void {
    this.rendered = on
    this.toggleState('drawn', on)
  }

  /**
   * Puts the reading on the prism at `index`, or lets it go with `-1`, as a
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
   * Says where the renderer draws the reading, as fractions of the strip from
   * its top left, or `undefined` while it draws none. The tooltip points
   * there. Called by the connector.
   */
  placeReading(at: { x: number; y: number } | undefined): void {
    this.place = at
  }

  /**
   * Says where the renderer draws the two ends of the front edge, under the
   * first column and the last, as fractions of the strip from its top left,
   * or `undefined` while they are out of view, where the labels keep the
   * last place they had. The `start` and `end` labels stand there. Called by
   * the connector.
   */
  placeCorners(at: DrawnCorners | undefined): void {
    if (at || !this.rendered) {
      this.corners = at
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.placeLabels()
    /* Told only on a change, so a renderer draws again only when it must. */
    const field = JSON.stringify(this.field)
    if (field !== this.told.field) {
      this.told.field = field
      this.dispatchEvent(new HelixPlotChangeEvent({ kind: 'data' }))
    }
    if (this.pointer.at !== this.told.at) {
      this.told.at = this.pointer.at
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
   * Shift with an arrow turns the view, the chart's own drawing or a
   * renderer's, and moves no reading, except under
   * `selection-mode="multiple"`, where it selects a range.
   */
  private readonly onTurnKeydown = (event: KeyboardEvent): void => {
    const turn = TURNS[event.key]
    if (
      !event.shiftKey ||
      !turn ||
      this.selectionMode === 'multiple' ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      this.onStripKeydown()
      return
    }
    event.preventDefault()
    event.stopPropagation()
    if (this.rendered) {
      this.dispatchEvent(new HelixPlotTurnEvent(turn))
    } else {
      this.camera = turned(this.camera, turn.across, turn.up)
    }
  }

  /**
   * How many readings fit, as whole columns, newest kept.
   *
   * The drawing runs at 30 degrees, so a cell takes `ACROSS` of its width, and
   * the rows run across too: a strip `rows` deep starts that many cells to the
   * left of its first column.
   */
  protected override get room(): number {
    const width = this.width
    if (width === undefined) {
      return this.points.length
    }
    const pitch = this.cellPx + this.gapPx
    const across = width / ACROSS - this.rowCount * pitch - this.gapPx
    return fits(
      this.points.length,
      Math.max(across, Number.MIN_VALUE),
      this.cellPx,
      this.gapPx,
      this.rowCount,
    )
  }

  /** The drawn readings as prisms, standing against the highest reading in the table. */
  private drawnRelief(): Relief {
    const tallest = this.flat ? 0 : Math.max(0, this.relief || 0)
    const highest = highestOf(this.points.map((point) => point.value))
    const heights = heightsOf(
      this.drawn.map((point) => point.value),
      highest,
      tallest,
    )
    return reliefOf(heights, this.rowCount, this.cellPx / (this.cellPx + this.gapPx), this.camera)
  }

  protected override render(): TemplateResult {
    const bounds = writtenNumbers(this.thresholds)
    const palette = writtenList(this.tones)
    const cells = this.drawn
    const readable = cells.length > 0
    const grid = readable && this.selectionMode !== undefined
    const keys = this.selectionMode ? this.keysOf(cells) : []
    const chosen = new Set(this.selectionMode ? commaList(this.value) : [])
    /* Held at its size through a drag, so it turns in place. */
    const fits = this.drawnRelief()
    const relief = { ...fits, box: this.drag.frame(fits.box, fits.middle) }
    this.shown = relief
    const at = this.pointer.at
    /* Painted back to front for the view, whatever the order of the readings. */
    const prisms = relief.order.map((index) =>
      this.renderPrism(
        relief.prisms[index] as Prism,
        at === index,
        chosen.has(keys[index] ?? ''),
        grid,
        toneOf(cells[index] ?? { value: undefined }, bounds, palette),
      ),
    )
    const { box } = relief
    /* **No drawing until there is something to draw**, as the flat strip draws
       no cells: a server has no table to read, and its frame is the strip. */
    const drawing = readable
      ? html`<svg
          aria-hidden=${grid ? nothing : 'true'}
          data-mirror
          part="drawing"
          role=${grid ? 'none' : nothing}
          style=${this.rendered ? 'opacity: 0; pointer-events: none' : nothing}
          viewBox="${box.x} ${box.y} ${box.width} ${box.height}"
          xmlns="http://www.w3.org/2000/svg"
          @click=${this.drag.click}
          @pointercancel=${this.onDrawingUp}
          @pointerdown=${this.onDrawingDown}
          @pointermove=${this.onDrawingMove}
          @pointerup=${this.onDrawingUp}
        >${relief.base ? this.renderBase(relief.base) : nothing}${prisms}${grid ? this.renderGridRows(cells.length, keys, chosen) : nothing}</svg>`
      : nothing
    return html`<div
        aria-activedescendant=${grid && at >= 0 ? `cell-${at}` : nothing}
        aria-describedby=${readable ? 'helix-chart-summary' : nothing}
        aria-label=${this.named || this.stripLabel}
        aria-multiselectable=${grid && this.selectionMode === 'multiple' ? 'true' : nothing}
        part="strip plot"
        id=${CHART_PLOT}
        role=${grid ? 'grid' : readable ? 'application' : 'img'}
        style="--spatial-heatmap-span: ${Math.ceil(cells.length / this.rowCount) + Math.min(this.rowCount, cells.length)}"
        tabindex=${readable ? '0' : nothing}
        @click=${this.onClick}
        @keydown=${this.onTurnKeydown}
        @pointerover=${this.rendered ? undefined : this.onPrismOver}
        @pointerleave=${this.onPointerLeave}
        @pointerup=${this.rendered ? undefined : this.onStripUp}
      ><slot name="renderer"></slot>${drawing}${this.renderTooltip(grid)}</div>
      ${cells.length === 0 ? this.renderStatus() : nothing}
      <div part="footer">
        <span part="start"><slot name="start"></slot></span>
        <span part="summary"><slot name="summary"></slot></span>
        <span part="end"><slot name="end"></slot></span>
      </div>${readable ? this.renderOverview(cells) : nothing}${
        this.status.spoken
          ? html`<span part="selection" role="status">${this.status.said}</span>`
          : nothing
      }${this.renderTable()}`
  }

  /**
   * One reading as a prism. The sides come first, so the top face is painted
   * over the edge they share with it, and a side the view does not show is
   * left out. Under `selection-mode` it is the picture of a grid cell, hidden
   * from a screen reader, which reads the cell itself.
   */
  private renderPrism(
    prism: Prism,
    active: boolean,
    picked: boolean,
    grid: boolean,
    tone: string | undefined,
  ): SVGTemplateResult {
    return svg`<g
      aria-hidden=${grid ? 'true' : nothing}
      data-index=${prism.index}
      data-tone=${tone ?? nothing}
      part="cell${active ? ' cell-active' : ''}${picked ? ' cell-selected' : ''}"
      style=${tone === undefined ? nothing : `--heatmap-tone: var(--heatmap-tone-${tone})`}
    >${prism.left ? svg`<path d=${prism.left} part="left-face"></path>` : nothing}${prism.right ? svg`<path d=${prism.right} part="right-face"></path>` : nothing}<path d=${prism.top} part="top-face"></path></g>`
  }

  /**
   * The slab under the prisms, painted first so every prism stands on it.
   * Hidden from screen readers, and out of a grid's rows.
   */
  private renderBase(base: Base): SVGTemplateResult {
    return svg`<g aria-hidden="true" part="base"><path d=${base.left} part="base-left"></path><path d=${base.right} part="base-right"></path><path d=${base.top} part="base-top"></path></g>`
  }

  /**
   * Stands the first and last labels under their ends of the front edge,
   * clear of the drawing, as the page lays them out: on each label,
   * `--spatial-heatmap-label-x` from the footer's inline start and
   * `--spatial-heatmap-label-y` from its top, and `data-placed` once it has
   * a place. **Measured**, because a label is the page's type and the
   * drawing scales with its box, so neither size is known before layout.
   */
  private placeLabels(): void {
    const footer = this.partNamed('footer')
    const [end, start] = [this.partNamed('end'), this.partNamed('start')]
    const relief = this.shown
    if (!footer || !end || !start || !relief?.corners) {
      return
    }
    const labels = { end, start }
    /* **Again whenever a label or the footer changes size**, as a webfont
       arriving after the first measure changes a label's width, and with it
       how far down the front edge reaches over it. Guarded because Lit SSR
       provides no `ResizeObserver`. */
    if (!this.labelSizes && typeof ResizeObserver !== 'undefined') {
      this.labelSizes = new ResizeObserver(() => this.placeLabels())
      for (const box of [footer, start, end]) {
        this.labelSizes.observe(box)
      }
    }
    const frame = footer.getBoundingClientRect()
    if (frame.width <= 0) {
      return
    }
    let drawn: DrawnCorners = { ...relief.corners, outline: relief.outline }
    let page: (point: Point) => Point
    /* A renderer's drawing is cut at the strip's edge, so a label stands no
       lower than a gap below it. */
    let lowest = Number.POSITIVE_INFINITY
    if (this.rendered) {
      const strip = this.partNamed('strip')?.getBoundingClientRect()
      if (!this.corners?.outline || !strip) {
        return
      }
      drawn = this.corners
      lowest = strip.bottom - frame.top + LABEL_GAP
      page = (point) => ({
        x: strip.left + point.x * strip.width - frame.left,
        y: strip.top + point.y * strip.height - frame.top,
      })
    } else {
      /* Through the drawing's own transform, which a right-to-left page
         mirrors. */
      const matrix = this.partNamed<SVGSVGElement>('drawing')?.getScreenCTM?.()
      if (!matrix) {
        return
      }
      page = (point) => ({
        x: matrix.a * point.x + matrix.c * point.y + matrix.e - frame.left,
        y: matrix.b * point.x + matrix.d * point.y + matrix.f - frame.top,
      })
    }
    const sizeOf = (label: HTMLElement): LabelSize => {
      const { height, width } = label.getBoundingClientRect()
      return { height, width }
    }
    const sizes = { end: sizeOf(labels.end), start: sizeOf(labels.start) }
    const placed = labelPlaces(
      (drawn.outline ?? []).map(page),
      { end: page(drawn.end), start: page(drawn.start) },
      sizes,
      frame.width,
      LABEL_GAP,
      lowest,
    )
    for (const key of ['start', 'end'] as const) {
      const at = placed[key]
      const inline = isRtl(this) ? frame.width - at.x - sizes[key].width : at.x
      labels[key].style.setProperty('--spatial-heatmap-label-x', `${Math.round(inline)}px`)
      labels[key].style.setProperty('--spatial-heatmap-label-y', `${Math.round(at.y)}px`)
      labels[key].toggleAttribute('data-placed', true)
    }
  }

  /**
   * The grid's rows, one for each column of the strip, and its cells in the
   * table's order, each named by its row and saying whether it is selected,
   * as the flat strip's cell is. They hold no drawing: the prisms are painted
   * apart, in the order the view needs.
   */
  private renderGridRows(
    count: number,
    keys: readonly string[],
    chosen: ReadonlySet<string>,
  ): SVGTemplateResult[] {
    const size = this.rowCount === 1 ? count : this.rowCount
    const first = this.points.length - this.drawn.length
    const rows: SVGTemplateResult[] = []
    for (let start = 0; start < count; start += size) {
      const cells: SVGTemplateResult[] = []
      for (let index = start; index < Math.min(start + size, count); index++) {
        const row = this.sourceRows[first + index]
        const name = row ? spokenReading(row) : ''
        cells.push(
          svg`<g aria-label=${name || nothing} aria-selected=${chosen.has(keys[index] ?? '') ? 'true' : 'false'} id=${`cell-${index}`} role="gridcell"></g>`,
        )
      }
      rows.push(svg`<g part="row" role="row">${cells}</g>`)
    }
    return rows
  }

  /**
   * The bubble over the top face of the reading the pointer or the keys rest
   * on, placed as a share of the drawing, which the strip's box matches.
   */
  protected override renderTooltip(grid = false): TemplateResult | typeof nothing {
    const at = this.pointer.at
    const prism = this.shown?.prisms[at]
    const box = this.shown?.box
    const reading = grid ? undefined : this.pointer
    /* Over the renderer's drawing, at the reading's place there. */
    if (this.rendered) {
      const place = this.place
      return drawTooltip(
        this.sourceRows,
        at >= 0 && place ? this.points.length - this.drawn.length + at : -1,
        this.tag('tooltip'),
        place
          ? { fixed: true, placement: 'top', x: `${place.x * 100}%`, y: `${place.y * 100}%` }
          : undefined,
        undefined,
        reading,
      )
    }
    if (at < 0 || !prism || !box || box.width <= 0 || box.height <= 0) {
      return drawTooltip(this.sourceRows, -1, this.tag('tooltip'), undefined, undefined, reading)
    }
    return drawTooltip(
      this.sourceRows,
      this.points.length - this.drawn.length + at,
      this.tag('tooltip'),
      {
        placement: 'top',
        x: `${((prism.peak.x - box.x) / box.width) * 100}%`,
        y: `${((prism.peak.y - box.y) / box.height) * 100}%`,
      },
      undefined,
      reading,
    )
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-spatial-heatmap': HelixHeadlessSpatialHeatmap
  }
}
