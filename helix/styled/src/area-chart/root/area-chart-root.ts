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
 * @since 0.1.0
 * @status experimental
 * @category charts
 * @groups charts
 * @aliases Stacked Area Chart, Composition Chart, Stream Chart
 * @documentation https://fusion.dev/helix/components/area-chart
 *
 * @cssproperty --area-chart-block-size - Height of the drawing.
 * @cssproperty --area-chart-fill-strength - How much of its series' color a band takes, as a percentage mixed toward the page.
 * @cssproperty --area-chart-gap - Space between the drawing and its labels.
 * @cssproperty --area-chart-gridline-color - One rule across the plot, under `gridlines`.
 * @cssproperty --area-chart-width - Thickness of a band's top edge, over `--chart-stroke`.
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
