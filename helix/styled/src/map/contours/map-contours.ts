import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMapContours } from '@fusion.dev/helix-headless/map'
import type { CSSResultGroup } from 'lit'
import { styles } from './map-contours.css.js'

/**
 * @summary Contour lines on a map, each at one height, labeled at every fifth.
 *
 * @description
 * Draws the lines in a brown mixed toward your theme's ink, the color of
 * contours on a printed map, so they read over a light or a dark map.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Contours, Topographic lines, Elevation lines, Isolines
 * @documentation https://fusion.dev/helix/components/map
 *
 * @cssproperty --map-contours-color - The lines' color.
 */
@customElement('helix-map-contours')
export class HelixMapContours extends HelixHeadlessMapContours {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-map-contours': HelixMapContours
  }
}
