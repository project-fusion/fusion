import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMapPoints } from '@fusion.dev/helix-headless/map'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './map-points.css.js'

/**
 * @summary Thousands of places on a map, loaded from data.
 *
 * @description
 * Draws the points in your theme's colors, with counts in white on your
 * primary color unless `tone` sets another.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Data layer, GeoJSON layer, Point cloud, Point layer
 * @documentation https://fusion.dev/helix/components/map
 *
 * @cssproperty --map-points-casing-color - The edge around each point and count.
 * @cssproperty --map-points-color - The points' color when no tone is set.
 * @cssproperty --map-points-ink - The color of the numbers in counts.
 */
@customElement('helix-map-points')
export class HelixMapPoints extends HelixHeadlessMapPoints {
  /** The points' color. Uses your primary color unless set. */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-map-points': HelixMapPoints
  }
}
