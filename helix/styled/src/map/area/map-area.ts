import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMapArea } from '@fusion.dev/helix-headless/map'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './map-area.css.js'

/**
 * @summary A region on a map, filled by the renderer in the page's theme.
 *
 * @description
 * The color is the whole of this tier: the brand by default, a `tone` where
 * the area means something, which the connector reads off this element and
 * hands to the renderer. What draws it, and why the frame names it in a list,
 * is the base class.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Map region, Polygon, Zone
 * @documentation https://fusion.dev/helix/components/map
 *
 * @cssproperty --map-area-color - The area's color, where no tone says it.
 */
@customElement('helix-map-area')
export class HelixMapArea extends HelixHeadlessMapArea {
  /** What the area means: the brand where this says nothing. */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-map-area': HelixMapArea
  }
}
