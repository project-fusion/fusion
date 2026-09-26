import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMapPoints } from '@fusion.dev/helix-headless/map'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './map-points.css.js'

/**
 * @summary Many places on a map at once, drawn by the renderer in the page's theme.
 *
 * @description
 * The colors and the walk's ring are this tier: the brand's fill by default and a
 * `tone` where the points mean something, each a fill a count is written on
 * in white and edged in the surface, which the connector reads off this
 * element and hands to the renderer. What draws them, and why the frame names
 * them, is the base class.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Data layer, GeoJSON layer, Point cloud, Point layer
 * @documentation https://fusion.dev/helix/components/map
 *
 * @cssproperty --map-points-casing-color - The edge round each point and count, so they read over the roads.
 * @cssproperty --map-points-color - The points' fill, where no tone says it.
 * @cssproperty --map-points-ink - What a count is written in.
 */
@customElement('helix-map-points')
export class HelixMapPoints extends HelixHeadlessMapPoints {
  /** What the points mean: the brand where this says nothing. */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-map-points': HelixMapPoints
  }
}
