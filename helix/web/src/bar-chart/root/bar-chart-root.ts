import { customElement } from '@helix-io/core'
import { HelixBaseBarChart } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as seriesStyles } from '../../chart/series.css.js'
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
 * @cssproperty --bar-chart-line-color - A `lines` series, overriding its series colour.
 * @cssproperty --bar-chart-line-width - Thickness of a `lines` series.
 * @cssproperty --bar-chart-gridline-color - One rule across the plot, under `gridlines`.
 * @cssproperty --bar-chart-bar-radius - Corner radius at the far end of a column.
 * @cssproperty --bar-chart-block-size - Height of the drawing.
 * @cssproperty --bar-chart-gap - Space between the drawing and its labels.
 */
@customElement('helix-bar-chart')
export class HelixBarChart extends HelixBaseBarChart {
  /**
   * What the columns are made of.
   *
   * **A third axis on the chart, not on the bar.** A bar is a mark inside a
   * drawing and nobody writes markup for one; the chart is what a consumer
   * addresses, so the choice belongs here and reaches every column at once.
   *
   * `glass` lets the gridlines read through the columns, which is what puts a
   * chart in the same language as a glass header rather than leaving it the one
   * opaque slab on the page. `gradient` fades each column toward its base, into
   * the wash the headless tier draws whether or not anything points at it.
   *
   * Absent is solid, per the rule that a reflected property takes no default,
   * so the stylesheet describes only the departure. The strength is the
   * theme's: `glass` scales with `--helix-material-opacity`, so a language that
   * is more see-through everywhere is more see-through here.
   *
   * Styled rather than headless, because what a bar is filled with is a
   * treatment and this tier is where treatments live. The gradient it points at
   * is drawn below, which is an element and therefore that tier's business.
   */
  @property({ reflect: true })
  material?: 'glass' | 'gradient'

  static override styles: CSSResultGroup = [seriesStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-bar-chart': HelixBarChart
  }
}
