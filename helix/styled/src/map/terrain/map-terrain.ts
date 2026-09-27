import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMapTerrain } from '@fusion.dev/helix-headless/map'
import type { CSSResultGroup } from 'lit'
import { styles } from './map-terrain.css.js'

/**
 * @summary Hills and mountains on a map, shaded and raised in 3D.
 *
 * @description
 * Shades the slopes with a translucent black on the side away from the light
 * and a translucent white on the side toward it, so the shading reads over
 * light and dark themes and over imagery.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Terrain, Hillshade, Elevation, Relief
 * @documentation https://fusion.dev/helix/components/map
 *
 * @cssproperty --map-terrain-highlight-color - The color of slopes that face the light.
 * @cssproperty --map-terrain-shadow-color - The color of slopes that face away from the light.
 */
@customElement('helix-map-terrain')
export class HelixMapTerrain extends HelixHeadlessMapTerrain {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-map-terrain': HelixMapTerrain
  }
}
