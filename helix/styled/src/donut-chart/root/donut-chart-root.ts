import { customElement } from '@helix-io/core'
import { HelixHeadlessDonutChart } from '@helix-io/headless/donut-chart'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as seriesStyles } from '../../chart/series.css.js'
import { styles } from './donut-chart-root.css.js'
import '../../tooltip/index.js'

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
 * **How thick the ring is drawn is `hole`, not a CSS hook.** It was
 * `--donut-chart-thickness`, and the stroke's width and the ring's radius have
 * to agree: the outer edge is `r + width / 2`, so setting one in CSS and
 * deriving the other in markup gives a drawing that is wrong in both. Measured
 * with the hook still in place, every ring came out twelve units thick whatever
 * its `hole`, so a pie was a small ring with a hole in it and `large` was drawn
 * larger than the default.
 *
 * @since 0.1.0
 * @status experimental
 * @category charts
 * @groups charts
 * @aliases Pie Chart, Ring Chart, Share Chart
 * @documentation https://helix.fusion.dev/components/donut-chart
 *
 * @cssproperty --donut-chart-size - Width and height of the ring.
 * @cssproperty --donut-chart-track-color - Color of the ring under the slices.
 */
@customElement('helix-donut-chart')
export class HelixDonutChart extends HelixHeadlessDonutChart {
  /**
   * How much ink the slices claim.
   *
   * `subtle` is the ring as a wash of its own colors: still readable, no longer
   * the loudest thing beside the number it is explaining.
   *
   * **One value and not three, because a slice is a stroke.** The mark *is* the
   * edge here, so there is nothing inside it for `outlined` to fade: `BarChart`
   * earns that value by keeping a column's area and fading it toward the page,
   * and a donut would have to be drawn as filled paths rather than arcs to do the
   * same. That is changing what a donut is to satisfy a word.
   */
  @property({ reflect: true })
  emphasis?: 'subtle'

  /**
   * What the ring is made of.
   *
   * `glass` lets the page read through the slices, for a chart sitting on a
   * surface that is itself translucent: a glass card with an opaque ring on it is
   * the two-designs-sharing-a-window failure a material policy exists to stop.
   * The track keeps its fill, a see-through groove being a missing one.
   *
   * The strength is the theme's, scaled by `--helix-material-opacity`.
   */
  @property({ reflect: true })
  material?: 'glass'

  static override styles: CSSResultGroup = [seriesStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-donut-chart': HelixDonutChart
  }
}
