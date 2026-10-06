import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessScatterChart } from '@fusion.dev/helix-headless/scatter-chart'
import type { CSSResultGroup } from 'lit'
import { styles as seriesStyles } from '../../shared/chart/series.css.js'
import { styles as tooltipStyles } from '../../shared/chart/tooltip.css.js'
import { styles } from './scatter-chart-root.css.js'
import '../../tooltip/index.js'

/**
 * @summary A chart that shows whether two measures move together, with one point per row.
 *
 * @description
 * The points take the series palette in order, so a table with one column
 * measured up uses the first color and a table with three uses the first three.
 *
 * Each point has a ring in the page background color and is slightly
 * transparent, so a dense cluster looks dense and overlapping points keep their
 * edges.
 *
 * No visual axis applies to the scatter chart, including `emphasis` and
 * `material`, because the points' opacity already carries data:
 *
 * - The points rest at 0.8 opacity, so where they overlap they darken, and a
 *   darker region has more rows. `solid` would make dense and sparse clusters
 *   look the same, and `outlined` would turn a cluster into overlapping rings
 *   that do not show the count.
 * - Translucency shows density, so `glass` and `frosted` would make each point
 *   count for less.
 *
 * To adjust the resting opacity, for example on a busier background, set
 * `--scatter-chart-point-opacity`.
 *
 * @since 0.1.0
 * @status stable
 * @category charts
 * @groups charts
 * @aliases Scatter Plot, XY Chart, Correlation Chart, Dot Plot
 * @documentation https://fusion.dev/helix/components/scatter-chart
 *
 * @cssproperty --scatter-chart-block-size - Height of the drawing.
 * @cssproperty --scatter-chart-bubble-size - Diameter of the largest point under `size`. The smallest is `--scatter-chart-point-size`.
 * @cssproperty --scatter-chart-gap - Space between the drawing and its axes.
 * @cssproperty --scatter-chart-gridline-color - Color of the gridlines across the plot, drawn when `gridlines` is set.
 * @cssproperty --scatter-chart-point-opacity - Opacity of a point, so a cluster looks darker where it is denser.
 * @cssproperty --scatter-chart-point-ring-color - Color of the ring around each point. It matches the page, so change it when the chart sits on another surface.
 * @cssproperty --scatter-chart-point-size - Diameter of a point.
 * @cssproperty --scatter-chart-trend-dash - The dash pattern of a line of best fit, under `trend`, as `stroke-dasharray` takes it. `none` draws it solid.
 * @cssproperty --scatter-chart-trend-width - The thickness of a line of best fit, under `trend`.
 */
@customElement('helix-scatter-chart')
export class HelixScatterChart extends HelixHeadlessScatterChart {
  /** The styled tier, so the tooltip this renders is the styled one. */
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [seriesStyles, tooltipStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-scatter-chart': HelixScatterChart
  }
}
