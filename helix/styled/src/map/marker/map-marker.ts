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
 * @cssproperty --map-marker-label-border-width - The name's edge, the theme's floating edge by default.
 * @cssproperty --map-marker-label-shadow - The name's lift, the theme's floating shadow by default.
 * @cssproperty --map-marker-size - How wide the point is.
 */
@customElement('helix-map-marker')
export class HelixMapMarker extends HelixHeadlessMapMarker {
  /**
   * The ground under the name. Absent is opaque; `glass` lets the map through
   * under a blur and `frosted` turns that up, `transparent` leaves the name
   * on the map. How see-through each is, is the theme's.
   */
  @property({ reflect: true })
  material?: 'frosted' | 'glass' | 'transparent'

  /**
   * How the point stands off the map: absent is an edge in the surface and a
   * little lift; `outlined` the edge alone, `elevated` the edge lifted, as an
   * elevated card is, `filled` a wash of its own color with no edge,
   * `plain` the bare point.
   */
  @property({ reflect: true })
  separation?: 'elevated' | 'filled' | 'outlined' | 'plain'

  /**
   * The point's shape, a circle where this says nothing: a page telling kinds
   * of place apart by more than their color, which a reader who cannot tell
   * the colors apart needs.
   */
  @property({ reflect: true })
  shape?: 'diamond' | 'ring' | 'rounded' | 'square'

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
