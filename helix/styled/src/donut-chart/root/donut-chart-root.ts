import { customElement } from '@helix-io/core'
import { HelixHeadlessDonutChart } from '@helix-io/headless/donut-chart'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as seriesStyles } from '../../shared/chart/series.css.js'
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
 * @cssproperty --donut-chart-edge-stroke - Thickness of the slice boundary under `outlined`.
 * @cssproperty --donut-chart-size - Width and height of the ring.
 * @cssproperty --donut-chart-track-color - Color of the ring under the slices.
 */
@customElement('helix-donut-chart')
export class HelixDonutChart extends HelixHeadlessDonutChart {
  /**
   * How much ink the slices claim.
   *
   * `solid` is the resting arrangement and selects nothing: a slice at full
   * strength is what the base rule already draws. `subtle` is the ring as a wash
   * of its own colors, still readable and no longer the loudest thing beside the
   * number it is explaining. `outlined` keeps the slice and fades it toward the
   * page, leaving a boundary in the series' own color, which is the same trade
   * `BarChart` makes on a column.
   *
   * **This took three values on 25 Aug 2026, and the note it replaces argued it
   * could not.** That note was right about the mark: a slice is a stroke on a
   * ring, the edge *is* the mark, and there is nothing within it to fade. It
   * concluded that `outlined` would mean drawing slices as filled paths instead
   * of arcs, and called that changing what a donut is to satisfy a word.
   *
   * What it did not weigh is that the two can both be there. The arc still draws
   * the slice and still carries the animation, and a closed path traces the same
   * wedge beside it for anything that needs a boundary. Nothing about the donut
   * changed; something was added next to it. See `renderEdge` on the tier below
   * for why the dash could not simply be replaced.
   *
   * The value that stays refused is `ghost`, which on a ring is a chart with no
   * slices.
   */
  @property({ reflect: true })
  emphasis?: 'outlined' | 'solid' | 'subtle'

  /**
   * What the ring is made of.
   *
   * `glass` lets the page read through the slices, for a chart sitting on a
   * surface that is itself translucent: a glass card with an opaque ring on it is
   * the two-designs-sharing-a-window failure a material policy exists to stop.
   * The track keeps its fill, a see-through groove being a missing one.
   *
   * The strength is the theme's, scaled by `--helix-material-opacity`.
   *
   * **This paints a mark rather than a ground, and the axis still reads the
   * same way.** On a surface the points are how much of the page shows through;
   * on a series they are how much ink the mark has, and the order is the same:
   * `glass` admits most, `frosted` admits less, absent is opaque. The two
   * factors, 0.62 and 0.88, carry the relationship the surface tokens carry
   * between `material-translucent` and `material-translucent-strong`, so a
   * chart and a card mean the same thing by the word.
   *
   * **`transparent` is where this one stops.** A mark with no ink is not a
   * material choice, it is an absent series, and a chart says that by not
   * having the datum rather than by painting it invisibly. See 270.
   */
  @property({ reflect: true })
  material?: 'frosted' | 'glass'

  static override styles: CSSResultGroup = [seriesStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-donut-chart': HelixDonutChart
  }
}
