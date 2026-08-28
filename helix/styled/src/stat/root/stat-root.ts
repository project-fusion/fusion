import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessStat } from '@fusion.dev/helix-headless/stat'
import type { CSSResultGroup } from 'lit'
import { styles } from './stat-root.css.js'

/**
 * @summary One measurement, with the word for what it measures.
 *
 * @description
 * The value is set on the display face at a size the type scale does not reach,
 * because a figure is the one place on a page where the number is the design.
 * The label sits above it in the label ramp, quiet and wide-tracked, so the
 * pair reads as one object rather than as two lines of text.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Metric, KPI, Figure
 * @documentation https://helix.fusion.dev/components/stat
 *
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
