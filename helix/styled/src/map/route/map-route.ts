import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMapRoute } from '@fusion.dev/helix-headless/map'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './map-route.css.js'

/**
 * @summary A line on a map, such as a route between stops.
 *
 * @description
 * Draws the route in your theme's colors, with a surface-colored casing under
 * it so it stands out from the roads. Uses your primary color unless `tone`
 * sets another.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Map line, Path, Polyline
 * @documentation https://fusion.dev/helix/components/map
 *
 * @cssproperty --map-route-casing-color - The color of the casing under the route.
 * @cssproperty --map-route-color - The route's color when no tone is set.
 */
@customElement('helix-map-route')
export class HelixMapRoute extends HelixHeadlessMapRoute {
  /** The route's color. Uses your primary color unless set. */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  /** `dotted` draws the route as dots, for a walk off the road network. */
  @property({ reflect: true })
  variant?: 'dotted'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-map-route': HelixMapRoute
  }
}
