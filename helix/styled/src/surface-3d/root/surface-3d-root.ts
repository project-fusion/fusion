import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSurface3d } from '@fusion.dev/helix-headless/surface-3d'
import type { CSSResultGroup } from 'lit'
import { styles } from './surface-3d-root.css.js'

/**
 * @summary A chart that draws a height over a grid as a surface in three dimensions, for a measure that varies over two others.
 *
 * @description
 * The surface is drawn in 3D by a renderer the page connects, and as a flat
 * grid seen from above until it has drawn. Every height is shaded along one
 * ramp from the theme's primary color, quiet where it is low and strong where
 * it is high, so the two drawings agree.
 *
 * @since 0.185.0
 * @status experimental
 * @category charts
 * @documentation https://fusion.dev/helix/components/surface-3d
 *
 * @cssproperty --surface-3d-block-size - How tall the plot is.
 * @cssproperty --surface-3d-high - The color of the highest reading, which the renderer reads too.
 * @cssproperty --surface-3d-low - The color of the lowest reading, which the renderer reads too.
 */
@customElement('helix-surface-3d')
export class HelixSurface3d extends HelixHeadlessSurface3d {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-surface-3d': HelixSurface3d
  }
}
