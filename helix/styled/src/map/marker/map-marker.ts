import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMapMarker } from '@fusion.dev/helix-headless/map'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './map-marker.css.js'

/**
 * @summary A named place on a map.
 *
 * @description
 * A point in your theme's colors with the place's name beside it. Uses your
 * primary color unless `tone` sets another.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Map pin, Place, Point of interest
 * @documentation https://fusion.dev/helix/components/map
 *
 * @cssproperty --map-marker-cluster-color - A cluster's fill color.
 * @cssproperty --map-marker-cluster-size - A cluster's width.
 * @cssproperty --map-marker-color - The point's color when no tone is set.
 * @cssproperty --map-marker-ink - The color of a letter or icon in the point. Set it with `--map-marker-color` when white is hard to read on your color.
 * @cssproperty --map-marker-label-border-width - The width of the name's border.
 * @cssproperty --map-marker-label-shadow - The name's shadow.
 * @cssproperty --map-marker-size - The point's width.
 */
@customElement('helix-map-marker')
export class HelixMapMarker extends HelixHeadlessMapMarker {
  /**
   * The background of the name. Leave unset for solid. `glass` shows the map
   * through a blur, `frosted` blurs more, and `transparent` has no background.
   */
  @property({ reflect: true })
  material?: 'frosted' | 'glass' | 'transparent'

  /**
   * How the point stands out from the map. Leave unset for a surface-colored
   * edge and a small shadow. `outlined` has the edge only, `elevated` a larger
   * shadow, `filled` a soft halo in the marker's color, and `plain` no edge or
   * shadow.
   */
  @property({ reflect: true })
  separation?: 'elevated' | 'filled' | 'outlined' | 'plain'

  /**
   * The point's shape. A circle unless set. Use shapes with tones to tell
   * kinds of places apart. `pin` places the tip of a pin on the location, for
   * a destination.
   */
  @property({ reflect: true })
  shape?: 'diamond' | 'pin' | 'ring' | 'rounded' | 'square'

  /** The point's color. Uses your primary color unless set. */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-map-marker': HelixMapMarker
  }
}
