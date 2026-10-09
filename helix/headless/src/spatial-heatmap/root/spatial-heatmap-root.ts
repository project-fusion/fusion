import {
  CHART_PLOT,
  commaList,
  customElement,
  drawTooltip,
  MIRROR_RULE,
  spokenReading,
  writtenList,
  writtenNumbers,
} from '@fusion.dev/helix-core'
import { html, nothing, type SVGTemplateResult, svg, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import '../../tooltip/index.js'
import { fits, toneOf } from '../../heatmap/root/buckets.js'
import { HelixHeadlessHeatmap } from '../../heatmap/root/heatmap-root.js'
import { ACROSS, type Base, heightsOf, highestOf, type Relief, reliefOf } from '../projection.js'

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
 * **`flat` lays every prism down** at no height, which leaves the tones on a
 * plane at the same angle.
 *
 * **The prisms stand on a slab**, the `base`, which reaches a little past the
 * grid, so the relief reads as one object. The `start` and `end` slots name
 * the two ends of the front edge, which is the strip's first and last column:
 * the component writes where those corners are on the `footer`, and a
 * stylesheet stands each label at its corner.
 *
 * **`gap` and `min-cell` set the smallest cell.** The drawing scales as a
 * whole, so a wider box draws larger cells and the gap grows with them. A box
 * too narrow for every column at `min-cell` draws the newest that fit.
 *
 * **The drawing is SVG and holds still.** It scales with its box through its
 * `viewBox`, needs no WebGL, and has no motion to pause.
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
 * | Escape | Puts the cell's tooltip away. |
 *
 * @since 0.185.0
 * @status experimental
 * @category charts
 * @aliases Isometric heatmap, Isometric chart, 3D heatmap, Relief chart, Isometric contribution graph
 * @documentation https://fusion.dev/helix/components/spatial-heatmap
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
 * @cssproperty --spatial-heatmap-depth - How tall the drawing is for its width. The component writes it on the footer, and a stylesheet that stands the `start` label at its corner reads it.
 * @cssproperty --spatial-heatmap-end-x - Where the front edge ends, under the newest column, across the drawing, from 0 at its inline start to 1. The component writes it on the footer, and a stylesheet that stands the `end` label there reads it.
 * @cssproperty --spatial-heatmap-span - How many cells the drawing spans across: its columns and its rows together. The component writes it on the strip, and a stylesheet that caps the cell size reads it.
 * @cssproperty --spatial-heatmap-start-y - How far down the drawing the front edge starts, under the first column, as a share of the drawing's width. The component writes it on the footer, and a stylesheet that stands the `start` label there reads it.
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
        @keydown=${this.onStripKeydown}
        @pointerover=${this.onPointerOver}
        @pointerleave=${this.onPointerLeave}
        @pointerup=${this.onPointerUp}
      >${drawing}${this.renderTooltip(grid)}</div>
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
    return [
      `--spatial-heatmap-depth: ${share(box.height / box.width)}`,
      `--spatial-heatmap-end-x: ${share((corners.end.x - box.x) / box.width)}`,
      `--spatial-heatmap-start-y: ${share((corners.start.y - box.y) / box.width)}`,
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
