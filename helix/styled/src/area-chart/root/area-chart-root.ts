import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessAreaChart } from '@fusion.dev/helix-headless/area-chart'
import type { CSSResultGroup } from 'lit'
import { styles as seriesStyles } from '../../shared/chart/series.css.js'
import { styles as tooltipStyles } from '../../shared/chart/tooltip.css.js'
import { styles } from './area-chart-root.css.js'
import '../../tooltip/index.js'

/**
 * @summary How a total is made up over time, as bands stacked on one another.
 *
 * @description
 * The bands take the series palette in order, the first column at the bottom,
 * so a legend beside the chart names them in the order they are stacked.
 *
 * Each band is a pale fill with its top edge drawn at the series' full color.
 * The fills are mixed toward the page rather than made translucent, because
 * the bands overlap where they are drawn and a translucent one would show the
 * others through it.
 *
 * **No visual axis applies here, and that is the answer rather than a gap.**
 * Both refusals are geometric and both were argued in the stylesheet before
 * they were argued anywhere a reader looks.
 *
 * `emphasis` is which of a family's two marks carries the reading, and here
 * neither can give way. The fill is the value, a band's thickness being its
 * amount, and the edge is the boundary, which is why it is drawn at full color
 * over a pale fill rather than left to two pale fills meeting. Every point on
 * the axis moves one at the other's expense: `outlined` thins the fill until
 * the chart is a set of cumulative lines, which is `LineChart` and is the form
 * this one exists because a reader cannot read shares off; `solid` takes the
 * fill to the series' own color, which is the edge's color, so the boundary
 * disappears into the band it bounds. `LineChart` can take the axis because its
 * wash is optional there, `area` deciding whether one is drawn at all.
 *
 * `material` is what reads through a mark, and a band cannot let anything
 * through. Each is drawn as everything under its top edge with the next one
 * down covering the rest, so a translucent band shows the bands behind it and
 * reads as a third color that is in no palette. That is `LineChart`'s recorded
 * reason for refusing `wash`, met here from the other side. The strength of a
 * fill is still adjustable and is `--area-chart-fill-strength`, which is a
 * continuum rather than an axis and is a theme's business rather than a
 * reader's.
 *
 * @since 0.1.0
 * @status stable
 * @category charts
 * @groups charts
 * @aliases Stacked Area Chart, Composition Chart, Banded Chart
 * @documentation https://fusion.dev/helix/components/area-chart
 *
 * @cssproperty --area-chart-block-size - Height of the drawing.
 * @cssproperty --area-chart-fill-strength - How much of its series' color a band takes, as a percentage mixed toward the page.
 * @cssproperty --area-chart-gap - Space between the drawing and its labels.
 * @cssproperty --area-chart-gridline-color - One rule across the plot, under `gridlines`.
 * @cssproperty --area-chart-width - Thickness of a band's top edge, over `--chart-stroke`.
 * @cssproperty --chart-stroke - Thickness of a band's top edge, one name across this family, Line Chart and Bar Chart's `lines`, since the three read one shared rule. `--area-chart-width` overrides it here.
 */
@customElement('helix-area-chart')
export class HelixAreaChart extends HelixHeadlessAreaChart {
  /** The styled tier, so the tooltip this renders is the styled one. */
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [seriesStyles, tooltipStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-area-chart': HelixAreaChart
  }
}
