import {
  customElement,
  drawTooltip,
  extent,
  HelixElement,
  linear,
  MixinChartSource,
  type Series,
  seriesIndex,
} from '@helix-io/core'
import { html, nothing, svg, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/** The drawing's own coordinates. Height only: the width is the element's. */
const HEIGHT = 100

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
 * @csspart tooltip - What a pointer resting on a reading shows.
 * @csspart tooltip-cell - One column's name and value inside the tooltip.
 * @csspart tooltip-label - The reading's own name inside the tooltip.
 * @csspart tooltip-name - A column's name inside the tooltip.
 * @csspart tooltip-value - A column's value inside the tooltip.
 */
@customElement('helix-base-bar-chart')
export class HelixBaseBarChart extends MixinChartSource(HelixElement) {
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

  protected override render(): TemplateResult {
    const series = this.series
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
    /* **The range is inverted for columns and not for bars**, which is the
       whole of what makes the two directions different arithmetic rather than
       one drawing turned on its side. SVG counts down from the top, so a column
       growing upward needs `[HEIGHT, 0]`; a bar growing rightward is already
       going the way x counts, so it takes `[0, HEIGHT]`.
     *
     * Reusing the inverted scale for both was the first version. It put the
       longest bar at x=0 and every shorter one hard against the right edge,
       growing away from the baseline instead of out of it. */
    const domain: [number, number] = [Math.min(0, low), Math.max(0, high)]
    const y =
      this.direction === 'horizontal' ? linear(domain, [0, HEIGHT]) : linear(domain, [HEIGHT, 0])
    const floor = y(0)

    const named = this.named

    return html`${this.renderPlot(series, categories, y, floor, named)}
      ${this.renderLabels(categories)}
      ${this.renderTooltip()}`
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
    const sideways = this.direction === 'horizontal'
    const slot = 100 / categories.length
    const thickness = (slot * 0.72) / Math.max(series.length, 1)

    /* **The geometry is computed for the axis it is drawn on, not rotated onto
       it.** The first version turned the whole plot with `rotate: 90deg`, which
       is the shorter CSS and does not work: a rotation is about the element's
       own centre, so the drawing left its grid cell entirely and the labels,
       which are a separate row, stayed where they were. What it produced was
       one column floating beside a list of names.
     *
     * Swapping the two axes here costs one branch and keeps every other fact
     * about the chart the same. `value` runs along x when the bars are
     * sideways and along y otherwise; `category` takes the other one. */
    const bar = (value: number, index: number, depth: number): TemplateResult => {
      const at = y(value)
      const along = Math.min(floor, at)
      const size = Math.abs(floor - at)
      const across = index * slot + slot * 0.14 + depth * thickness
      return sideways
        ? svg`<rect
            data-series=${seriesIndex(depth)}
            height=${thickness}
            part="bar"
            width=${size}
            x=${along}
            y=${across}
          />`
        : svg`<rect
            data-series=${seriesIndex(depth)}
            height=${size}
            part="bar"
            width=${thickness}
            x=${across}
            y=${along}
          />`
    }

    return html`<div aria-hidden="true" part="plot" title=${named || nothing}>
      <svg
        preserveAspectRatio="none"
        viewBox="0 0 100 ${HEIGHT}"
        xmlns="http://www.w3.org/2000/svg"
      >
        ${
          sideways
            ? svg`<line part="baseline" x1=${floor} x2=${floor} y1="0" y2="100" />`
            : svg`<line part="baseline" x1="0" x2="100" y1=${floor} y2=${floor} />`
        }
        ${categories.map(
          (_, index) =>
            /* The group the tooltip is about says so, and the stylesheet fades
               the rest. A tooltip over a chart of five categories otherwise
               makes a reader match its heading against the row of names to find
               out which columns it means. */
            svg`<g data-active=${this.pointer.at === index ? '' : nothing} part="group">
              ${series.map((one, depth) => bar(one.points[index]?.value ?? 0, index, depth))}
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

  /**
   * What a pointer resting on a reading shows.
   *
   * A seam over `drawTooltip`, which holds the markup every chart shares. The
   * usual reason to override is arrangement: every cell of the row is already
   * there, including the columns nothing was plotted from.
   */
  protected renderTooltip(): TemplateResult | typeof nothing {
    return drawTooltip(this.rows, this.pointer.at)
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-bar-chart': HelixBaseBarChart
  }
}
