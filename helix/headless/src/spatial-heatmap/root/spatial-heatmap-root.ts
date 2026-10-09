import {
  CHART_PLOT,
  commaList,
  customElement,
  drawTooltip,
  HelixPlotChangeEvent,
  HelixPlotTurnEvent,
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
import { ACROSS, type Base, heightsOf, highestOf, type Relief, reliefOf } from '../projection.js'

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
 * **It was `helix-isometric-heatmap` until 0.188.0**, and
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
 * the two ends of the front edge, which is the strip's first and last column:
 * the component writes where those corners are on the `footer`, and a
 * stylesheet stands each label at its corner. A renderer tells the chart where
 * it draws those corners, so the labels stand at them there too, and follow
 * them as the view turns.
 *
 * **`gap` and `min-cell` set the smallest cell.** The drawing scales as a
 * whole, so a wider box draws larger cells and the gap grows with them. A box
 * too narrow for every column at `min-cell` draws the newest that fit.
 *
 * **The drawing is SVG and holds still.** It scales with its box through its
 * `viewBox`, needs no WebGL, and has no motion to pause.
 *
 * **A renderer can draw it in 3D instead.** Put a box for it in the
 * `renderer` slot, and `connectSpatialHeatmap` from `@fusion.dev/helix-plot`
 * draws the prisms in it with three.js, lit, in the same tones, in a view
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
 * | Shift with an arrow | Turns a renderer's view, where one is connected and `selection-mode` is not `multiple`. |
 * | Escape | Puts the cell's tooltip away. |
 *
 * @since 0.188.0
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
 * @csspart cell - One reading: a group holding its three faces.
 * @csspart drawing - The SVG every prism is drawn in. It is mirrored on a right-to-left page.
 * @csspart left-face - The face of a prism toward the next row, drawn at its lower left.
 * @csspart right-face - The face of a prism toward the next column, drawn at its lower right.
 * @csspart row - A column of prisms, which a grid reads as a row, under `selection-mode`.
 * @csspart strip - The box the drawing fills, which takes focus to be read by key. It is named by the host's `aria-labelledby` or `aria-label`, then by `label`, then by the caption of the table.
 * @csspart top-face - The top of a prism, which carries the reading's tone.
 *
 * @cssproperty --spatial-heatmap-depth - How tall the drawing is for its width. The component writes it on the footer, and a stylesheet that stands the `start` and `end` labels at their corners reads it.
 * @cssproperty --spatial-heatmap-end-x - Where the front edge ends, under the newest column, across the drawing, from 0 at its inline start to 1. The component writes it on the footer, and a stylesheet that stands the `end` label there reads it.
 * @cssproperty --spatial-heatmap-end-y - How far down the drawing the front edge ends, under the newest column, as a share of the drawing's width: its whole depth in the chart's own drawing, and wherever a renderer draws it. The component writes it on the footer, and a stylesheet that stands the `end` label there reads it.
 * @cssproperty --spatial-heatmap-span - How many cells the drawing spans across: its columns and its rows together. The component writes it on the strip, and a stylesheet that caps the cell size reads it.
 * @cssproperty --spatial-heatmap-start-x - Where the front edge starts, under the first column, across the drawing, from 0 at its inline start to 1: 0 in the chart's own drawing, and wherever a renderer draws it. The component writes it on the footer, and a stylesheet that stands the `start` label there reads it.
 * @cssproperty --spatial-heatmap-start-y - How far down the drawing the front edge starts, under the first column, as a share of the drawing's width. The component writes it on the footer, and a stylesheet that stands the `start` label there reads it.
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

  /** Whether a renderer has drawn the relief, which its own drawing then stays under. */
  @state()
  private rendered = false

  /** Where the renderer draws the reading, which the tooltip points at. */
  @state()
  private place: { x: number; y: number } | undefined

  /** Where the renderer draws the two ends of the front edge, which the first and last labels stand at. */
  @state()
  private corners: { end: { x: number; y: number }; start: { x: number; y: number } } | undefined

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
  placeCorners(
    at: { end: { x: number; y: number }; start: { x: number; y: number } } | undefined,
  ): void {
    if (at || !this.rendered) {
      this.corners = at
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
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
   * Shift with an arrow turns a renderer's view, and moves no reading,
   * except under `selection-mode="multiple"`, where it selects a range.
   */
  private readonly onTurnKeydown = (event: KeyboardEvent): void => {
    const turn = TURNS[event.key]
    if (
      !this.rendered ||
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
    this.dispatchEvent(new HelixPlotTurnEvent(turn))
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
    return reliefOf(heights, this.rowCount, this.cellPx / (this.cellPx + this.gapPx))
  }

  protected override render(): TemplateResult {
    const bounds = writtenNumbers(this.thresholds)
    const palette = writtenList(this.tones)
    const cells = this.drawn
    const readable = cells.length > 0
    const grid = readable && this.selectionMode !== undefined
    const keys = this.selectionMode ? this.keysOf(cells) : []
    const chosen = new Set(this.selectionMode ? commaList(this.value) : [])
    const relief = this.drawnRelief()
    this.shown = relief
    const at = this.pointer.at
    const prisms = relief.prisms.map((prism) =>
      this.renderPrism(
        prism.index,
        prism.top,
        prism.left,
        prism.right,
        at === prism.index,
        chosen.has(keys[prism.index] ?? ''),
        grid,
        toneOf(cells[prism.index] ?? { value: undefined }, bounds, palette),
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
        >${relief.base ? this.renderBase(relief.base) : nothing}${grid ? this.renderPrismRows(prisms) : prisms}</svg>`
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
        @pointerover=${this.rendered ? undefined : this.onPointerOver}
        @pointerleave=${this.onPointerLeave}
        @pointerup=${this.rendered ? undefined : this.onPointerUp}
      ><slot name="renderer"></slot>${drawing}${this.renderTooltip(grid)}</div>
      ${cells.length === 0 ? this.renderStatus() : nothing}
      <div part="footer" style=${this.cornersStyle(relief)}>
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
   * over the edge they share with it.
   *
   * Under `selection-mode` the prism is a `gridcell` named by its row in the
   * table and saying whether it is selected, as the flat strip's cell is.
   */
  private renderPrism(
    index: number,
    top: string,
    left: string,
    right: string,
    active: boolean,
    picked: boolean,
    grid: boolean,
    tone: string | undefined,
  ): SVGTemplateResult {
    const row = grid ? this.sourceRows[this.points.length - this.drawn.length + index] : undefined
    const name = row ? spokenReading(row) : ''
    return svg`<g
      aria-label=${grid && name ? name : nothing}
      aria-selected=${grid ? (picked ? 'true' : 'false') : nothing}
      data-index=${index}
      data-tone=${tone ?? nothing}
      id=${grid ? `cell-${index}` : nothing}
      part="cell${active ? ' cell-active' : ''}${picked ? ' cell-selected' : ''}"
      role=${grid ? 'gridcell' : nothing}
      style=${tone === undefined ? nothing : `--heatmap-tone: var(--heatmap-tone-${tone})`}
    ><path d=${left} part="left-face"></path><path d=${right} part="right-face"></path><path d=${top} part="top-face"></path></g>`
  }

  /**
   * The slab under the prisms, painted first so every prism stands on it.
   * Hidden from screen readers, and out of a grid's rows.
   */
  private renderBase(base: Base): SVGTemplateResult {
    return svg`<g aria-hidden="true" part="base"><path d=${base.left} part="base-left"></path><path d=${base.right} part="base-right"></path><path d=${base.top} part="base-top"></path></g>`
  }

  /**
   * Where the front edge's two ends stand, for the labels that name them.
   * **As shares of the drawing's width**, the one length a percentage margin
   * is measured against, so a sheet places a label with no height to read.
   */
  private cornersStyle(relief: Relief): string | typeof nothing {
    const { box, corners } = relief
    if (!corners || box.width <= 0) {
      return nothing
    }
    const share = (value: number): number => Math.round(value * 10000) / 10000
    const depth = box.height / box.width
    /* **Where a renderer draws them, while one does**, as fractions of the
       strip, which its drawing fills and which keeps the chart's own drawing's
       shape. The renderer's drawing is not mirrored on a right-to-left page,
       so across is turned round to run from the inline start there. */
    const drawn = this.rendered ? this.corners : undefined
    const across = (x: number): number => (isRtl(this) ? 1 - x : x)
    const start = drawn
      ? { x: across(drawn.start.x), y: drawn.start.y * depth }
      : { x: 0, y: (corners.start.y - box.y) / box.width }
    const end = drawn
      ? { x: across(drawn.end.x), y: drawn.end.y * depth }
      : { x: (corners.end.x - box.x) / box.width, y: depth }
    return [
      `--spatial-heatmap-depth: ${share(depth)}`,
      `--spatial-heatmap-end-x: ${share(end.x)}`,
      `--spatial-heatmap-end-y: ${share(end.y)}`,
      `--spatial-heatmap-start-x: ${share(start.x)}`,
      `--spatial-heatmap-start-y: ${share(start.y)}`,
    ].join('; ')
  }

  /**
   * The prisms as a grid's rows, one for each column of the strip, which is
   * also the order they are painted in.
   */
  private renderPrismRows(prisms: SVGTemplateResult[]): SVGTemplateResult[] {
    const size = this.rowCount === 1 ? prisms.length : this.rowCount
    const rows: SVGTemplateResult[] = []
    for (let start = 0; start < prisms.length; start += size) {
      rows.push(svg`<g part="row" role="row">${prisms.slice(start, start + size)}</g>`)
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
