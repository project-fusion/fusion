import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMapBuildings } from '@fusion.dev/helix-headless/map'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './map-buildings.css.js'

/**
 * @summary The buildings on a map, raised to their real heights in 3D.
 *
 * @description
 * Raises the buildings in your theme's raised surface color, one step off the
 * land, so they read as solid in light and dark themes. Set `tone` to color
 * them by meaning.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases 3D buildings, Extrusion
 * @documentation https://fusion.dev/helix/components/map
 *
 * @cssproperty --map-buildings-color - The buildings' color when no tone is set.
 */
@customElement('helix-map-buildings')
export class HelixMapBuildings extends HelixHeadlessMapBuildings {
  /** The buildings' color. Uses your raised surface color unless set. */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-map-buildings': HelixMapBuildings
  }
}
