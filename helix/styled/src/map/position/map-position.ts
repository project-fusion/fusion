import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMapPosition } from '@fusion.dev/helix-headless/map'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './map-position.css.js'

/**
 * @summary Something moving on a map, drawn in the page's theme.
 *
 * @description
 * A point in the brand, or in its `tone`, with a ring as wide as the position
 * is uncertain and a cone the way it is going. What places it, and why only
 * its description is heard, is the base class.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Current location, Live position, Tracker, You are here
 * @documentation https://fusion.dev/helix/components/map
 *
 * @cssproperty --map-position-color - The point's color, where no tone says it.
 * @cssproperty --map-position-size - How wide the point is.
 */
@customElement('helix-map-position')
export class HelixMapPosition extends HelixHeadlessMapPosition {
  /** What it is: the brand where this says nothing. */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-map-position': HelixMapPosition
  }
}
