import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessScatterChart } from '@fusion.dev/helix-headless/scatter-chart'
import type { CSSResultGroup } from 'lit'
import { styles as seriesStyles } from '../../shared/chart/series.css.js'
import { styles as tooltipStyles } from '../../shared/chart/tooltip.css.js'
import { styles } from './scatter-chart-root.css.js'
import '../../tooltip/index.js'

/**
 * @summary Whether two measures move together, one point per row.
 *
 * @description
 * The points take the series palette in order, so a table with one column
 * measured up is series one and a table with three is the first three.
 *
 * Each point has a ring of the page around it and stops short of opaque, so a
 * dense cluster reads as dense rather than as one blot, and two points that
 * overlap each keep their edge.
 *
 * @since 0.1.0
 * @status experimental
 * @category charts
 * @groups charts
 * @aliases Scatter Plot, XY Chart, Correlation Chart, Dot Plot
 * @documentation https://fusion.dev/helix/components/scatter-chart
 *
 * @cssproperty --scatter-chart-block-size - Height of the drawing.
 * @cssproperty --scatter-chart-gap - Space between the drawing and its axes.
 * @cssproperty --scatter-chart-gridline-color - One rule across the plot, under `gridlines`.
 * @cssproperty --scatter-chart-point-opacity - How much of its color a point shows, so a cluster reads darker where it is denser.
 * @cssproperty --scatter-chart-point-ring-color - The ring around each point, which is the page's color unless the chart sits on something else.
 * @cssproperty --scatter-chart-point-size - Diameter of a point.
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
