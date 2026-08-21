import { customElement } from '@helix-io/core'
import { HelixBaseChartLegend } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './chart-legend-root.css.js'

/**
 * @summary The names a chart draws, each beside the colour it is drawn in.
 *
 * @description
 * A row that wraps, because a legend sits under a chart as wide as the chart
 * and there is no arrangement of eight names that fits every width. Set
 * `--chart-legend-direction` to `column` where it sits beside one instead.
 *
 * The eight series colours are mapped here rather than in the tier below, which
 * carries the index and holds no tokens. Written as eight rules for the reason
 * `Avatar.Group` writes twelve: an index in markup cannot select a token, and a
 * custom property set inline would be the headless tier naming a colour.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Key, Series Key
 * @documentation https://helix.fusion.dev/components/chart-legend
 *
 * @cssproperty --chart-legend-direction - `row`, which wraps, or `column`.
 * @cssproperty --chart-legend-gap - Space between entries.
 * @cssproperty --chart-legend-swatch-size - Size of the colour patch.
 */
@customElement('helix-chart-legend')
export class HelixChartLegend extends HelixBaseChartLegend {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-chart-legend': HelixChartLegend
  }
}
