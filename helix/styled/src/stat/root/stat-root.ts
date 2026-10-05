import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessStat } from '@fusion.dev/helix-headless/stat'
import type { CSSResultGroup } from 'lit'
import { styles } from './stat-root.css.js'

/**
 * @summary One measurement, with a label that names what it measures.
 *
 * @description
 * The value uses the display typeface at a size above the type scale, because
 * the figure is the focus. The label sits above it in the label style, small
 * and widely tracked, so the pair reads as one unit.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Metric, KPI, Figure
 * @documentation https://fusion.dev/helix/components/stat
 *
 * @csspart value - The slot the value is written in. A slot draws no box, so it takes the inherited properties, such as color and font, and passes them to the value.
 *
 * @cssproperty --stat-gap - Space between the label and the value, and between the value and the unit in a row.
 * @cssproperty --stat-label-color - Color of the label.
 * @cssproperty --stat-label-size - Size of the label.
 * @cssproperty --stat-unit-color - Color of the unit.
 * @cssproperty --stat-unit-size - Size of the unit.
 * @cssproperty --stat-value-color - Color of the figure.
 * @cssproperty --stat-value-size - Size of the figure.
 */
@customElement('helix-stat')
export class HelixStat extends HelixHeadlessStat {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-stat': HelixStat
  }
}
