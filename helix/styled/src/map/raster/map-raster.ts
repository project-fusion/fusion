import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMapRaster } from '@fusion.dev/helix-headless/map'
import type { CSSResultGroup } from 'lit'
import { styles } from './map-raster.css.js'

/**
 * @summary Map tiles laid over a map, such as weather radar.
 *
 * @description
 * The tiles keep their own colors, such as a radar provider's scale, and draw
 * at `opacity` so the map shows through.
 *
 * @since 0.105.0
 * @status experimental
 * @category media
 * @aliases Weather radar, Tile overlay, Raster layer
 * @documentation https://fusion.dev/helix/components/map
 */
@customElement('helix-map-raster')
export class HelixMapRaster extends HelixHeadlessMapRaster {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-map-raster': HelixMapRaster
  }
}
