import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessIsometricHeatmap } from '@fusion.dev/helix-headless/isometric-heatmap'
import type { CSSResultGroup } from 'lit'
import { styles as tooltipStyles } from '../../shared/chart/tooltip.css.js'
import { styles } from './isometric-heatmap-root.css.js'
import '../../tooltip/index.js'

/**
 * @summary A heatmap drawn as a relief, where each reading stands as tall as its value.
 *
 * @description
 * Each reading is a prism. The top face takes the cell's tone, and the two
 * sides are the same tone, shaded darker, so the whole relief follows your
 * theme's colors.
 *
 * `tones="1 2 3 4 5"` uses the same five-step ramp as `Heatmap`, so the tone
 * and the height both show the value. Set `--isometric-heatmap-cell-size` to
 * change how large a cell may grow.
 *
 * @since 0.185.0
 * @status experimental
 * @category charts
 * @documentation https://fusion.dev/helix/components/isometric-heatmap
 *
 * @cssproperty --isometric-heatmap-cell-size - The largest a cell grows, along its edge. The strip is never wider than its box, and draws smaller cells to fit.
 * @cssproperty --isometric-heatmap-left-shade - How much darker the left face is than the top, as a percentage mixed toward black.
 * @cssproperty --isometric-heatmap-right-shade - How much darker the right face is than the top, as a percentage mixed toward black.
 * @cssproperty --isometric-heatmap-selected-color - The color of the dashed edges of a selected prism, under `selection-mode`. By default, white on a dark face and black on a light one.
 */
@customElement('helix-isometric-heatmap')
export class HelixIsometricHeatmap extends HelixHeadlessIsometricHeatmap {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [tooltipStyles, styles]

  /**
   * The smallest cell, in CSS pixels, before the strip draws fewer columns.
   * `gap` is two pixels at that size, so a prism covers five sixths of its cell.
   */
  override minCell = 10
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-isometric-heatmap': HelixIsometricHeatmap
  }
}
