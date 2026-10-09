import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSpatialScatterChart } from '@fusion.dev/helix-headless/spatial-scatter-chart'
import type { CSSResultGroup } from 'lit'
import { styles as seriesStyles } from '../../shared/chart/series.css.js'
import { styles } from './spatial-scatter-chart-root.css.js'

/**
 * @summary A chart that plots each row as a point in three dimensions, for data with three measures.
 *
 * @description
 * The points are drawn in 3D by a renderer the page connects, and as a flat
 * scatter of the first two measures until it has drawn. Each group takes a
 * series color from the theme, as every chart's series does.
 *
 * @since 0.185.0
 * @status experimental
 * @category charts
 * @documentation https://fusion.dev/helix/components/spatial-scatter-chart
 *
 * @cssproperty --spatial-scatter-chart-block-size - How tall the plot is.
 * @cssproperty --spatial-scatter-chart-point-size - How large a point of the flat scatter is drawn.
 */
@customElement('helix-spatial-scatter-chart')
export class HelixSpatialScatterChart extends HelixHeadlessSpatialScatterChart {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [seriesStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-spatial-scatter-chart': HelixSpatialScatterChart
  }
}
