import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMapLandcover } from '@fusion.dev/helix-headless/map'
import type { CSSResultGroup } from 'lit'
import { styles } from './map-landcover.css.js'

/**
 * @summary What covers the ground on a map: forest, grass, farmland, wetland, sand, rock, and ice.
 *
 * @description
 * Mixes each cover's color into your theme's land color, so the ground is
 * colored by what covers it in a light or a dark theme.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Land cover, Land use, Vegetation, Ground cover
 * @documentation https://fusion.dev/helix/components/map
 *
 * @cssproperty --map-landcover-ground - The land color the covers are mixed into.
 */
@customElement('helix-map-landcover')
export class HelixMapLandcover extends HelixHeadlessMapLandcover {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-map-landcover': HelixMapLandcover
  }
}
