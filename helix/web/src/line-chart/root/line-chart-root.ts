import { customElement } from '@helix-io/core'
import { HelixBaseLineChart } from '@helix-io/headless/line-chart'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
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
 * @category charts
 * @groups charts
 * @aliases Time Series, Trend Chart, Multi-line Chart
 * @documentation https://helix.fusion.dev/components/line-chart
 *
 * @cssproperty --line-chart-band-color - The slot the pointer is resting in.
 * @cssproperty --line-chart-gridline-color - One rule across the plot, under `gridlines`.
 * @cssproperty --line-chart-area-opacity - How much of a line's color its wash takes.
 * @cssproperty --line-chart-block-size - Height of the drawing.
 * @cssproperty --line-chart-gap - Space between the drawing and its labels.
 * @cssproperty --line-chart-width - Thickness of a line.
 */
@customElement('helix-line-chart')
export class HelixLineChart extends HelixBaseLineChart {
  /**
   * How much ink the lines claim.
   *
   * `subtle` mixes each series toward the page, so a chart that is context stays
   * legible without competing. Toward the page rather than translucent, because a
   * translucent line takes its color from whatever it crosses, which on a chart
   * with several is the whole risk.
   *
   * **`outlined` is refused and `area` is why.** On a column, `outlined` is the
   * edge without the loud fill; the line chart's version of that is the line
   * without its wash, and `area` already says exactly that. A second spelling
   * would be the drift this axis exists to prevent, so it defers to the property
   * that got there first.
   */
  @property({ reflect: true })
  emphasis?: 'subtle'

  /**
   * What the lines are made of.
   *
   * `glass` lets the gridlines read through them, which is what translucency is
   * for on a chart rather than decoration.
   *
   * On the lines and not the wash: the wash is already scaled by
   * `--helix-material-opacity` whatever this says, being a wash by nature, and
   * scaling it twice would compound the policy against itself.
   */
  @property({ reflect: true })
  material?: 'glass'

  static override styles: CSSResultGroup = [seriesStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-line-chart': HelixLineChart
  }
}
