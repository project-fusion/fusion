import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDonutChart } from '@fusion.dev/helix-headless/donut-chart'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as seriesStyles } from '../../shared/chart/series.css.js'
import { styles as tooltipStyles } from '../../shared/chart/tooltip.css.js'
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
 * **How thick the ring is drawn is `hole`, not a CSS hook.** The stroke's width
 * and the ring's radius have to agree: the outer edge is `r + width / 2`, so
 * setting one in CSS and deriving the other in markup gives a drawing that is
 * wrong in both. Measured with such a hook in place, every ring came out twelve
 * units thick whatever its `hole`, so a pie was a small ring with a hole in it
 * and `large` was drawn larger than the default.
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
   * **The styled tier, so the tooltip this renders is the styled one.**
   *
   * `tag()` builds a child's tag name from this prefix, and the base declares
   * `helix-headless-`. Every other styled component that renders a child
   * overrides it; the three charts that draw a tooltip did not, so a
   * `helix-bar-chart` on a page put a `helix-headless-tooltip` in its shadow
   * root: the behavior with none of the surface. What showed was the browser's
   * own popover defaults, a white 1.5px border, square corners, `0.25em` of
   * padding and the page's font size, which is why the reading bubble looked
   * like no other tooltip on the site.
   *
   * Measured before the fix: the chart's bubble computed
   * `border: 1.5px solid rgb(255, 255, 255)`, `border-radius: 0px`,
   * `padding: 3.5px`, `font-size: 14px`. The masthead's, a `helix-tooltip`,
   * had the component's own `none`, `radii-sm`, `2xs xs` and `text-xs`.
   */
  static override tier = 'helix-'

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
   * **A slice is a stroke on a ring, so `outlined` is a second mark rather than
   * a change to the first.** The edge *is* the mark and there is nothing within
   * it to fade, so the arc keeps drawing the slice and carrying the animation
   * and a closed path traces the same wedge beside it. Redrawing slices as
   * filled paths instead of arcs would be changing what a donut is to satisfy a
   * word. See `renderEdge` on the tier below for why the dash could not simply
   * be replaced.
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
   * having the datum rather than by painting it invisibly.
   */
  @property({ reflect: true })
  material?: 'frosted' | 'glass'

  static override styles: CSSResultGroup = [seriesStyles, tooltipStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-donut-chart': HelixDonutChart
  }
}
