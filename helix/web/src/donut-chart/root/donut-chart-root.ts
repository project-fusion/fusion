import { customElement } from '@helix-io/core'
import { HelixBaseDonutChart } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './donut-chart-root.css.js'

/**
 * @summary Parts of a whole as a ring, read from a table.
 *
 * @description
 * The slices take the series palette in order, so a legend beside it maps the
 * same twenty-four.
 *
 * The ring starts at twelve o'clock, which is a rotation applied here rather
 * than arithmetic done below: where a reader expects the first slice to begin
 * is a fact about the picture, not about the numbers.
 *
 * A track is drawn under the slices, so a ring whose values do not fill it
 * still reads as a ring with a gap rather than as a broken arc.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Pie Chart, Ring Chart, Share Chart
 * @documentation https://helix.fusion.dev/components/donut-chart
 *
 * @cssproperty --donut-chart-size - Width and height of the ring.
 * @cssproperty --donut-chart-thickness - How heavy the ring is drawn.
 * @cssproperty --donut-chart-track-color - Colour of the ring under the slices.
 */
@customElement('helix-donut-chart')
export class HelixDonutChart extends HelixBaseDonutChart {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-donut-chart': HelixDonutChart
  }
}
