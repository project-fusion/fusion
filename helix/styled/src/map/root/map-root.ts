import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMap } from '@fusion.dev/helix-headless/map'
import type { CSSResultGroup } from 'lit'
import { styles as viewportStyles } from '../../shared/viewport/viewport.css.js'
import { styles } from './map-root.css.js'

/**
 * @summary A frame around somebody else's map.
 *
 * @description
 * Presentation only: a bordered well with the controls over it, at the corner
 * every map puts them. What the frame is for, and why the controls are buttons
 * rather than arrow keys, is the base class.
 *
 * **The controls do not fade with the chrome.** A reader who has gone still has
 * not stopped needing the only controls this frame offers, so the idle state
 * takes the header and footer a consumer slotted and leaves the buttons alone.
 *
 * @since 0.100.0
 * @status stable
 * @category media
 * @aliases Map frame, Map container, Geo
 * @documentation https://fusion.dev/helix/components/map
 *
 * @cssproperty --map-background-color - The well behind the map, seen while tiles are on their way.
 * @cssproperty --map-block-size - How tall the frame is. A length, since the map fills it.
 * @cssproperty --map-border-color - Color of the frame's edge.
 * @cssproperty --map-control-background-color - The ground under the pan and zoom buttons.
 */
@customElement('helix-map')
export class HelixMap extends HelixHeadlessMap {
  /* The surface's sheet first, this family's after, so a map's own rules win
     where the two speak about the same box. */
  static override styles: CSSResultGroup = [viewportStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-map': HelixMap
  }
}
