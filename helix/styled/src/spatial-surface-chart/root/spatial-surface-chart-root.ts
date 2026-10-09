import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSpatialSurfaceChart } from '@fusion.dev/helix-headless/spatial-surface-chart'
import type { CSSResultGroup } from 'lit'
import { styles as tooltipStyles } from '../../shared/chart/tooltip.css.js'
import { styles } from './spatial-surface-chart-root.css.js'
import '../../tooltip/index.js'

/**
 * @summary A chart that draws a height over a grid as a surface in three dimensions, for a measure that varies over two others.
 *
 * @description
 * The surface is drawn in 3D by a renderer the page connects, and as a flat
 * grid seen from above until it has drawn. Every height is shaded along one
 * ramp from the theme's primary color, quiet where it is low and strong where
 * it is high, so the two drawings agree.
 *
 * @since 0.185.0
 * @status experimental
 * @category charts
 * @documentation https://fusion.dev/helix/components/spatial-surface-chart
 *
 * @cssproperty --spatial-surface-chart-block-size - How tall the plot is.
 * @cssproperty --spatial-surface-chart-high - The color of the highest reading, which the renderer reads too.
 * @cssproperty --spatial-surface-chart-low - The color of the lowest reading, which the renderer reads too.
 */
@customElement('helix-spatial-surface-chart')
export class HelixSpatialSurfaceChart extends HelixHeadlessSpatialSurfaceChart {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [tooltipStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-spatial-surface-chart': HelixSpatialSurfaceChart
  }
}
