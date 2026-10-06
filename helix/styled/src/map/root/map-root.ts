import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMap } from '@fusion.dev/helix-headless/map'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles as viewportStyles } from '../../shared/viewport/viewport.css.js'
import { styles } from './map-root.css.js'

/**
 * @summary A frame around a map drawn by another library.
 *
 * @description
 * The styled frame: a bordered box with the pan and zoom buttons in its top
 * corner. The buttons stay visible when the header and footer fade.
 *
 * Set `fill` to lay the map behind a page's own content, such as a hero whose
 * words decide its height: the frame covers its container, which needs a
 * position of its own, such as `position: relative`. Set `credit-placement`
 * to draw the map's credit compact in a corner over the map, which suits a
 * map the width of the page.
 *
 * @since 0.100.0
 * @status experimental
 * @category media
 * @aliases Map frame, Map container, Geo
 * @documentation https://fusion.dev/helix/components/map
 *
 * @cssproperty --map-attribution-border-color - The rule above the map credit, under the map.
 * @cssproperty --map-attribution-color - The color of the map credit.
 * @cssproperty --map-attribution-font-size - The size of the map credit's text.
 * @cssproperty --map-background-color - The color behind the map while tiles load.
 * @cssproperty --map-block-size - The frame's height, as a length. Ignored with `fill`, where the container decides it.
 * @cssproperty --map-border-color - The frame's border color.
 * @cssproperty --map-chosen-color - The fill of the pressed 3D button and the ring around the chosen map type and each shown layer in the layers menu.
 * @cssproperty --map-layers-menu-gap - The space between the map types and the layers in the layers menu.
 * @cssproperty --map-layers-menu-inline-size - The width of the layers menu.
 * @cssproperty --map-layers-menu-padding - The space inside the edge of the layers menu.
 * @cssproperty --map-needle-north-color - The north half of the compass needle.
 * @cssproperty --map-needle-south-color - The south half of the compass needle.
 * @cssproperty --map-radius - The frame's corners.
 * @cssproperty --viewport-control-background-color - The background of the pan and zoom buttons. Canvas uses the same property.
 */
@customElement('helix-map')
export class HelixMap extends HelixHeadlessMap {
  /**
   * Where the map's credit is drawn. Unset, it is a strip under the map.
   * `bottom-end` or `bottom-start` draws it in that corner over the map, on
   * one line that shows the whole credit on hover or focus, the form
   * OpenStreetMap's attribution guidance accepts for a small credit. Keep it
   * clear of a corner the controls are in.
   */
  @property({ attribute: 'credit-placement', reflect: true })
  creditPlacement?: 'bottom-end' | 'bottom-start'

  /**
   * Covers the container instead of taking a height of its own, for a map
   * behind a page's content. The container needs a position, such as
   * `position: relative`. The frame draws no border or corners then, since
   * the container's edge is the map's.
   */
  @property({ reflect: true, type: Boolean })
  fill = false

  /**
   * The background of the pan and zoom buttons. Leave unset for solid. `glass`
   * shows the map through a blur, `frosted` blurs more, and `transparent` has
   * no background. Your theme sets how see-through each one is.
   */
  @property({ reflect: true })
  material?: 'frosted' | 'glass' | 'transparent'

  /* The surface's sheet first, this family's after, so a map's own rules win
     where the two speak about the same box. The live region's clip first of
     all, as that sheet asks. */
  static override styles: CSSResultGroup = [liveStyles, viewportStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-map': HelixMap
  }
}
