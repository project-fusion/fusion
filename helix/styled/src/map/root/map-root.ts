import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMap } from '@fusion.dev/helix-headless/map'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as viewportStyles } from '../../shared/viewport/viewport.css.js'
import { styles } from './map-root.css.js'

/**
 * @summary A frame around a map drawn by another library.
 *
 * @description
 * The styled frame: a bordered box with the pan and zoom buttons in its top
 * corner. The buttons stay visible when the header and footer fade.
 *
 * @since 0.100.0
 * @status experimental
 * @category media
 * @aliases Map frame, Map container, Geo
 * @documentation https://fusion.dev/helix/components/map
 *
 * @cssproperty --map-background-color - The color behind the map while tiles load.
 * @cssproperty --map-block-size - The frame's height, as a length.
 * @cssproperty --map-border-color - The frame's border color.
 * @cssproperty --viewport-control-background-color - The background of the pan and zoom buttons. Canvas uses the same property.
 */
@customElement('helix-map')
export class HelixMap extends HelixHeadlessMap {
  /**
   * The background of the pan and zoom buttons. Leave unset for solid. `glass`
   * shows the map through a blur, `frosted` blurs more, and `transparent` has
   * no background. Your theme sets how see-through each one is.
   */
  @property({ reflect: true })
  material?: 'frosted' | 'glass' | 'transparent'

  /* The surface's sheet first, this family's after, so a map's own rules win
     where the two speak about the same box. */
  static override styles: CSSResultGroup = [viewportStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-map': HelixMap
  }
}
