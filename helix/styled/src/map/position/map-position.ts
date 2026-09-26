import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMapPosition } from '@fusion.dev/helix-headless/map'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './map-position.css.js'

/**
 * @summary A moving point on a map, such as a vehicle or a person.
 *
 * @description
 * Draws the position in your theme's foreground color with a surface-colored
 * edge, or in a `tone`. A position with a heading is drawn as an arrow.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Current location, Live position, Tracker, You are here
 * @documentation https://fusion.dev/helix/components/map
 *
 * @cssproperty --map-position-color - The color of the halo, direction cone, and pulse when no tone is set.
 * @cssproperty --map-position-edge - The edge around the point and the arrow.
 * @cssproperty --map-position-fill - The color of the point and the arrow when no tone is set.
 * @cssproperty --map-position-size - The point's width.
 */
@customElement('helix-map-position')
export class HelixMapPosition extends HelixHeadlessMapPosition {
  /**
   * How the point stands out from the map. Leave unset for an edge, a halo,
   * and a small shadow. `outlined` has the edge only, `elevated` a larger
   * shadow, `filled` the halo without an edge, and `plain` none of these.
   */
  @property({ reflect: true })
  separation?: 'elevated' | 'filled' | 'outlined' | 'plain'

  /**
   * The point's shape. A circle unless set. A position with a heading is
   * always an arrow.
   */
  @property({ reflect: true })
  shape?: 'diamond' | 'ring' | 'rounded' | 'square'

  /** The position's color. Uses your theme's foreground color unless set. */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-map-position': HelixMapPosition
  }
}
