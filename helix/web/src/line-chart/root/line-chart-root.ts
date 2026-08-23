import { customElement } from '@helix-io/core'
import { HelixBaseLineChart } from '@helix-io/headless/line-chart'
import type { CSSResultGroup } from 'lit'
import { styles as seriesStyles } from '../../chart/series.css.js'
import { styles } from './line-chart-root.css.js'
import '../../tooltip/index.js'

/**
 * @summary A series over time as a line, read from a table.
 *
 * @description
 * The lines take the series palette in order, so a chart of one is series one
 * and a chart of four is the first four, and a legend beside it maps the same
 * twenty-four.
 *
 * The stroke does not scale with the box. `preserveAspectRatio="none"` is what
 * lets one drawing fill a narrow card and a wide panel, and without
 * `vector-effect: non-scaling-stroke` the same line comes out hairline in the
 * first and heavy in the second. It rescues strokes and not geometry, which is
 * why the readings are joined by lines and marked by nothing: a circle in a
 * stretched coordinate space is an ellipse, and there is no vector-effect that
 * answers for a shape.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Time Series, Trend Chart, Multi-line Chart
 * @documentation https://helix.fusion.dev/components/line-chart
 *
 * @cssproperty --line-chart-band-color - The slot the pointer is resting in.
 * @cssproperty --line-chart-gridline-color - One rule across the plot, under `gridlines`.
 * @cssproperty --line-chart-area-opacity - How much of a line's colour its wash takes.
 * @cssproperty --line-chart-block-size - Height of the drawing.
 * @cssproperty --line-chart-gap - Space between the drawing and its labels.
 * @cssproperty --line-chart-width - Thickness of a line.
 */
@customElement('helix-line-chart')
export class HelixLineChart extends HelixBaseLineChart {
  static override styles: CSSResultGroup = [seriesStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-line-chart': HelixLineChart
  }
}
