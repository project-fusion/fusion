import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessScatter3d } from '@fusion.dev/helix-headless/scatter-3d'
import type { CSSResultGroup } from 'lit'
import { styles as seriesStyles } from '../../shared/chart/series.css.js'
import { styles } from './scatter-3d-root.css.js'

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
 * @documentation https://fusion.dev/helix/components/scatter-3d
 *
 * @cssproperty --scatter-3d-block-size - How tall the plot is.
 * @cssproperty --scatter-3d-point-size - How large a point of the flat scatter is drawn.
 */
@customElement('helix-scatter-3d')
export class HelixScatter3d extends HelixHeadlessScatter3d {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [seriesStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-scatter-3d': HelixScatter3d
  }
}
