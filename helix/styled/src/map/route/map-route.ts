import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMapRoute } from '@fusion.dev/helix-headless/map'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './map-route.css.js'

/**
 * @summary A line on a map, drawn by the renderer in the page's theme.
 *
 * @description
 * The color is the whole of this tier: the brand by default, a `tone` where
 * the route means something, which the connector reads off this element and
 * hands to the renderer. What draws it, and why the frame names it in a list,
 * is the base class.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Map line, Path, Polyline
 * @documentation https://fusion.dev/helix/components/map
 *
 * @cssproperty --map-route-color - The route's color, where no tone says it.
 */
@customElement('helix-map-route')
export class HelixMapRoute extends HelixHeadlessMapRoute {
  /** What the route means: the brand where this says nothing. */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-map-route': HelixMapRoute
  }
}
