import {
  customElement,
  extent,
  HelixElement,
  linear,
  readSeries,
  type Series,
} from '@helix-io/core'
import { html, nothing, type PropertyValues, svg, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/** The drawing's own coordinates. Height only: the width is the element's. */
const HEIGHT = 100

/** How many colours the series palette has, and so where it starts over. */
const PALETTE = 24

/**
 * @summary Categories as columns, read from a table.
 *
 * @description
 * The chart most often asked for and the one most often drawn wrongly, so two
 * decisions are made here rather than left to a consumer.
 *
 * **It measures from zero and there is no property to change that.** A bar's
 * length *is* its value, so a baseline anywhere else makes the lengths
 * proportional to nothing. That is the oldest misleading chart there is, and a
 * design system that ships the switch has shipped the mistake. A reader who
 * wants the differences between values rather than the values should be drawing
 * a line, which claims only a shape.
 *
 * **The labels are HTML beside the drawing rather than `<text>` inside it.** An
 * `<svg>` that fills its box scales everything in it, including type: the same
 * `font-size` comes out at 10px in a narrow chart and 43px in a wide one, and
 * there is no non-scaling-font to answer it the way `vector-effect` answers
 * strokes. So the columns are drawn and the words are written around them.
 *
 * The table is the accessible representation and this drawing is `aria-hidden`.
 * A reader who wants the numbers gets the numbers, not a described picture of
 * them.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Column Chart, Categorical Chart
 * @documentation https://helix.fusion.dev/components/bar-chart
 *
 * @csspart bar - One column.
 * @csspart baseline - The rule the columns stand on.
 * @csspart group - One category's columns, together.
 * @csspart label - One category's name.
 * @csspart labels - The row of category names.
 * @csspart plot - The drawing.
 */
@customElement('helix-base-bar-chart')
export class HelixBaseBarChart extends HelixElement {
  /**
   * The id of the table to read.
   *
   * Resolved through `getRootNode()`, so a chart inside another component's
   * shadow root names a table in that root rather than in the document. A
   * `<table>` or anything built from grid roles, including `helix-table`.
   *
   * **In React this arrives as a property and not as an attribute**, the way
   * `Tooltip.for` does, so it does not reflect and nothing styles on it.
   */
  @property()
  for = ''

  /**
   * Whether the categories run down the side rather than along the bottom.
   *
   * Absent is columns. `horizontal` is the one to reach for when the category
   * names are words rather than dates: a row of long names either overlaps or
   * turns on its side, and neither is as readable as putting them down the left
   * where they read normally.
   */
  @property({ reflect: true })
  direction?: 'horizontal'

  /**
   * What the chart is, in a sentence, for the drawing's accessible name.
   *
   * Absent falls back to the table's own caption, which is usually the right
   * words already written once.
   */
  @property()
  label = ''

  #observer: MutationObserver | undefined

  override connectedCallback(): void {
    super.connectedCallback()
    this.#watch()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#observer?.disconnect()
    this.#observer = undefined
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('for')) {
      this.#watch()
    }
  }

  /** The table or grid `for` names, or null where there is no document. */
  #source(): Element | null {
    if (this.for === '') {
      return null
    }
    const root = this.getRootNode() as Document | ShadowRoot
    const found = root.getElementById?.(this.for)
    const role = found?.getAttribute('role')
    const grid =
      role === 'table' || role === 'grid' || /^helix-(base-)?table$/i.test(found?.tagName ?? '')
    return found?.tagName === 'TABLE' || grid ? (found ?? null) : null
  }

  /** Follows the table, so an update to the numbers reaches the columns. */
  #watch(): void {
    this.#observer?.disconnect()
    const source = this.#source()
    if (!source || typeof MutationObserver === 'undefined') {
      return
    }
    this.#observer ??= new MutationObserver(() => {
      this.requestUpdate()
    })
    this.#observer.observe(source, { characterData: true, childList: true, subtree: true })
  }

  protected override render(): TemplateResult {
    const source = this.#source()
    const series: Series[] = source ? readSeries(source) : []
    const categories = series[0]?.points.map((point) => point.label) ?? []
    if (categories.length === 0) {
      return html`<div part="plot"></div>`
    }

    /* Zero at both ends, so a series that goes negative gets a baseline inside
       the box and its columns hang below it. `extent` over every series at once
       rather than per series, because two series drawn to different scales are
       two charts sharing a picture. */
    const values = series.flatMap((one) => one.points.map((point) => point.value))
    const [low, high] = extent(values.length > 0 ? values : [0])
    const y = linear([Math.min(0, low), Math.max(0, high)], [HEIGHT, 0])
    const floor = y(0)

    const named = this.label || source?.querySelector('caption')?.textContent?.trim() || ''

    return html`${this.renderPlot(series, categories, y, floor, named)}
      ${this.renderLabels(categories)}`
  }

  /**
   * The columns themselves, behind a seam the styled tier can move.
   *
   * `aria-hidden`, because the table it was read from is the readable version
   * and a screen reader hearing both hears the same numbers twice.
   */
  protected renderPlot(
    series: Series[],
    categories: string[],
    y: (value: number) => number,
    floor: number,
    named: string,
  ): TemplateResult {
    const slot = 100 / categories.length
    const width = (slot * 0.72) / Math.max(series.length, 1)

    return html`<div aria-hidden="true" part="plot" title=${named || nothing}>
      <svg
        preserveAspectRatio="none"
        viewBox="0 0 100 ${HEIGHT}"
        xmlns="http://www.w3.org/2000/svg"
      >
        ${svg`<line
          part="baseline"
          x1="0"
          x2="100"
          y1=${floor}
          y2=${floor}
        />`}
        ${categories.map(
          (_, index) =>
            svg`<g part="group">
              ${series.map((one, depth) => {
                const value = one.points[index]?.value ?? 0
                const at = y(value)
                return svg`<rect
                  data-series=${(depth % PALETTE) + 1}
                  height=${Math.abs(floor - at)}
                  part="bar"
                  width=${width}
                  x=${index * slot + slot * 0.14 + depth * width}
                  y=${Math.min(floor, at)}
                />`
              })}
            </g>`,
        )}
      </svg>
    </div>`
  }

  /**
   * The category names, as HTML beside the drawing rather than inside it.
   *
   * Inside, they would scale with the box: an `<svg>` that fills its container
   * scales its type along with everything else, and there is no non-scaling
   * equivalent for a font the way `vector-effect` is one for a stroke.
   */
  protected renderLabels(categories: string[]): TemplateResult {
    return html`<div aria-hidden="true" part="labels">
      ${categories.map((one) => html`<span part="label">${one}</span>`)}
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-bar-chart': HelixBaseBarChart
  }
}
