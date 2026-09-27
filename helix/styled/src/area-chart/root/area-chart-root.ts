import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessAreaChart } from '@fusion.dev/helix-headless/area-chart'
import type { CSSResultGroup } from 'lit'
import { styles as seriesStyles } from '../../shared/chart/series.css.js'
import { styles as tooltipStyles } from '../../shared/chart/tooltip.css.js'
import { styles } from './area-chart-root.css.js'
import '../../tooltip/index.js'

/**
 * @summary A chart that shows how a total is made up over time, as bands stacked on one another.
 *
 * @description
 * The bands take the series palette in order, with the first column at the
 * bottom, so a legend lists them in stacking order.
 *
 * Each band is a pale fill with its top edge in the series' full color. The
 * fills are mixed toward the page background, because translucent bands would
 * show each other where they overlap.
 *
 * **The chart supports neither the `emphasis` nor the `material` axis.**
 *
 * - `emphasis`: the fill shows the value and the edge shows the boundary, and
 *   both need to stay. `outlined` would thin the fill into cumulative lines,
 *   which is `LineChart`. `solid` would fill the band in the edge color, so the
 *   boundary would disappear.
 * - `material`: a band covers everything under its top edge, so a translucent
 *   band would show the bands behind it as a color outside the palette.
 *   `LineChart` has no `wash` for the same reason.
 *
 * To change the strength of the fills, set `--area-chart-fill-strength` in your
 * theme.
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
 * @cssproperty --area-chart-gridline-color - Color of the rules drawn across the plot under `gridlines`.
 * @cssproperty --area-chart-width - Thickness of a band's top edge. Overrides `--chart-stroke`.
 * @cssproperty --chart-stroke - Thickness of a band's top edge. Area Chart, Line Chart, and Bar Chart's `lines` all read this one property. `--area-chart-width` overrides it here.
 */
@customElement('helix-area-chart')
export class HelixAreaChart extends HelixHeadlessAreaChart {
  /**
   * The tag prefix for child elements. Set to the styled tier, so the chart
   * renders the styled tooltip.
   */
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [seriesStyles, tooltipStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-area-chart': HelixAreaChart
  }
}
