import { customElement } from '@helix-io/core'
import { HelixBaseBarChart } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './bar-chart-root.css.js'
import '../../tooltip/index.js'

/**
 * @summary Categories as columns, read from a table.
 *
 * @description
 * The columns take the series palette in order, so a chart of one is series one
 * and a chart of four is the first four. Rounded at the far end only, because a
 * column grows from the baseline and a rounded foot would lift it off the rule
 * it is measured against.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Column Chart, Categorical Chart
 * @documentation https://helix.fusion.dev/components/bar-chart
 *
 * @cssproperty --bar-chart-band-color - The slot the pointer is resting in.
 * @cssproperty --bar-chart-gridline-color - One rule across the plot, under `gridlines`.
 * @cssproperty --bar-chart-bar-radius - Corner radius at the far end of a column.
 * @cssproperty --bar-chart-block-size - Height of the drawing.
 * @cssproperty --bar-chart-gap - Space between the drawing and its labels.
 */
@customElement('helix-bar-chart')
export class HelixBarChart extends HelixBaseBarChart {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-bar-chart': HelixBarChart
  }
}
