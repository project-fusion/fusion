import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMapArea } from '@fusion.dev/helix-headless/map'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './map-area.css.js'

/**
 * @summary A shape on a map, such as a delivery zone.
 *
 * @description
 * Fills the area in your theme's colors. Uses your primary color unless
 * `tone` sets another.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Map region, Polygon, Zone
 * @documentation https://fusion.dev/helix/components/map
 *
 * @cssproperty --map-area-color - The area's color when no tone is set.
 */
@customElement('helix-map-area')
export class HelixMapArea extends HelixHeadlessMapArea {
  /** The area's color. Uses your primary color unless set. */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-map-area': HelixMapArea
  }
}
