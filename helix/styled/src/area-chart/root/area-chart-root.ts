import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessAreaChart } from '@fusion.dev/helix-headless/area-chart'
import type { CSSResultGroup } from 'lit'
import { styles as motionStyles } from '../../shared/chart/motion.css.js'
import { styles as rescaleStyles } from '../../shared/chart/rescale.css.js'
import { styles as seriesStyles } from '../../shared/chart/series.css.js'
import { styles as sonifyStyles } from '../../shared/chart/sonify.css.js'
import { styles as statusStyles } from '../../shared/chart/status.css.js'
import { styles as statusMarkStyles } from '../../shared/chart/status-mark.css.js'
import { styles as tooltipStyles } from '../../shared/chart/tooltip.css.js'
import { styles } from './area-chart-root.generated.css.js'
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
 * @use A total over time and the parts it is made of, such as visits a month by source.
 * @instead line-chart - Series over time that you compare with one another.
 * @instead bar-chart - A comparison across categories, such as signups by channel.
 * @instead donut-chart - Parts of a whole at one moment.
 * @anatomy axis
 * @anatomy gridline
 * @anatomy area
 * @anatomy labels
 * @practice Leave a total column out of the table `for` names. - Every numeric column is a part, so a total column is counted twice.
 * @practice Point `for` at a table on the page, and set `data` only where there is none. - A table reads before any script runs.
 * @documentation https://fusion.dev/helix/components/area-chart
 *
 * @cssproperty --area-chart-block-size - Height of the drawing.
 * @cssproperty --area-chart-fill-strength - How much of its series' color a band takes, as a percentage mixed toward the page.
 * @cssproperty --area-chart-gap - Space between the drawing and its labels.
 * @cssproperty --area-chart-gridline-color - Color of the rules drawn across the plot.
 * @cssproperty --area-chart-overlap-opacity - How much of each band shows under `overlap`, where the bands in front let the ones behind show through.
 * @cssproperty --area-chart-width - Thickness of a band's top edge. Overrides `--chart-stroke`.
 * @cssproperty --chart-glide-duration - How long the guide and the tooltip take to glide from one reading to the next, along `--helix-easing-decelerate`, as the pointer or the keys move. Defaults to `--helix-duration-fast`. `0s` places them at once, and under reduced motion they move at once, whatever it says. They are placed where their reading is when a reading is shown from none. Bar Chart, Line Chart, Area Chart, Donut Chart, Scatter Chart, Sparkline, and Heatmap share this property.
 * @cssproperty --chart-move-duration - How long a mark takes to move to a new reading. Defaults to `--helix-duration-normal`. `0s` moves nothing, and under reduced motion nothing moves, whatever it says. The wash fading in as the chart arrives takes 1.6 times as long. A series a legend hides fades out over the same time, and the value axis and its rules move to the new scale with the marks. Bar Chart, Line Chart, Area Chart, Donut Chart, Scatter Chart, Sparkline, and Heatmap share this property.
 * @cssproperty --chart-move-easing - The curve a mark moves to a new reading along. Defaults to `--helix-easing-decelerate`. Bar Chart, Line Chart, Area Chart, Donut Chart, Scatter Chart, Sparkline, and Heatmap share this property.
 * @cssproperty --chart-stroke - Thickness of a band's top edge. Area Chart, Line Chart, and Bar Chart's `lines` all read this one property. `--area-chart-width` overrides it here.
 */
@customElement('helix-area-chart')
export class HelixAreaChart extends HelixHeadlessAreaChart {
  /**
   * The tag prefix for child elements. Set to the styled tier, so the chart
   * renders the styled tooltip.
   */
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [
    motionStyles,
    rescaleStyles,
    seriesStyles,
    statusStyles,
    tooltipStyles,
    styles,
    sonifyStyles,
    statusMarkStyles,
  ]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-area-chart': HelixAreaChart
  }
}
