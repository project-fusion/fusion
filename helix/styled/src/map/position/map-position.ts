import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMapPosition } from '@fusion.dev/helix-headless/map'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './map-position.css.js'

/**
 * @summary Something moving on a map, drawn in the page's theme.
 *
 * @description
 * A point in the page's own surface ringed in its ink, or in its `tone`, with a ring as wide as the
 * position is uncertain, and a beam and an arrow the way it is going. What
 * places it, and why only its description is heard, is the base class.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Current location, Live position, Tracker, You are here
 * @documentation https://fusion.dev/helix/components/map
 *
 * @cssproperty --map-position-color - The wash around the point, its halo, beam and pulse, where no tone says it.
 * @cssproperty --map-position-edge - The ring around the point and the outline of its arrow, where no tone says it.
 * @cssproperty --map-position-fill - The point's body and its arrow's, where no tone says it.
 * @cssproperty --map-position-size - How wide the point is.
 */
@customElement('helix-map-position')
export class HelixMapPosition extends HelixHeadlessMapPosition {
  /**
   * How it stands off the map: absent is its edge, a halo and a little lift;
   * `outlined` the edge alone, `elevated` the edge lifted, as an
   * elevated card is, `filled` the halo with no edge, `plain` the bare point.
   */
  @property({ reflect: true })
  separation?: 'elevated' | 'filled' | 'outlined' | 'plain'

  /**
   * The point's shape, a circle where this says nothing. A position with a
   * heading is drawn as its arrow whatever this says.
   */
  @property({ reflect: true })
  shape?: 'diamond' | 'ring' | 'rounded' | 'square'

  /**
   * What it is: the page's own two colors where this says nothing, apart
   * from the brand the places are in; its body and its wash in the tone
   * where this says one.
   */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-map-position': HelixMapPosition
  }
}
