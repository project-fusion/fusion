import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMapMarker } from '@fusion.dev/helix-headless/map'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './map-marker.css.js'

/**
 * @summary A place on a map, named and reachable from the keyboard.
 *
 * @description
 * A point in the page's theme with its name beside it, the name shown while the
 * marker is pointed at or focused. **The brand by default**, which is what the
 * map's main roads are drawn in, so the places a page adds read as the page's
 * own; `tone` says what a place means where it means something.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Map pin, Place, Point of interest
 * @documentation https://fusion.dev/helix/components/map
 *
 * @cssproperty --map-marker-color - The point's color, where no tone says it.
 * @cssproperty --map-marker-size - How wide the point is.
 */
@customElement('helix-map-marker')
export class HelixMapMarker extends HelixHeadlessMapMarker {
  /** What the place means: the brand where this says nothing. */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-map-marker': HelixMapMarker
  }
}
