import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessBarChart } from '@fusion.dev/helix-headless/bar-chart'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as seriesStyles } from '../../shared/chart/series.css.js'
import { styles as sonifyStyles } from '../../shared/chart/sonify.css.js'
import { styles as statusStyles } from '../../shared/chart/status.css.js'
import { styles as statusMarkStyles } from '../../shared/chart/status-mark.css.js'
import { styles as tooltipStyles } from '../../shared/chart/tooltip.css.js'
import { styles } from './bar-chart-root.css.js'
import '../../tooltip/index.js'

/**
 * @summary A chart that draws a table's categories as columns.
 *
 * @description
 * The columns take the series palette in order, so a chart with one series uses
 * the first color and a chart with four uses the first four. Only the end away
 * from the baseline is rounded, so each column sits flat on the rule it is
 * measured from.
 *
 * @since 0.1.0
 * @status stable
 * @category charts
 * @groups charts
 * @aliases Column Chart, Categorical Chart
 * @documentation https://fusion.dev/helix/components/bar-chart
 *
 * @cssproperty --bar-chart-band-color - Fill of the category band under the pointer.
 * @cssproperty --bar-chart-bar-radius - Corner radius at the far end of a column.
 * @cssproperty --bar-chart-bar-stroke - Width of the edge an `outlined` or `subtle`
 *   column is drawn with.
 * @cssproperty --bar-chart-block-size - Height of the drawing.
 * @cssproperty --bar-chart-gap - Space between the drawing and its labels.
 * @cssproperty --bar-chart-gridline-color - Color of the gridlines drawn across the plot.
 * @cssproperty --bar-chart-line-color - Color of a `lines` series. Overrides its series color.
 * @cssproperty --bar-chart-line-width - Thickness of a `lines` series. Overrides `--chart-stroke`.
 * @cssproperty --chart-stroke - Thickness of a `lines` series. Bar Chart, Line Chart, and the top edge of Area Chart share this property. `--bar-chart-line-width` overrides it here.
 */
@customElement('helix-bar-chart')
export class HelixBarChart extends HelixHeadlessBarChart {
  /**
   * **The styled tier, so the chart renders the styled tooltip.**
   *
   * `tag()` builds a child's tag name from this prefix, and the base declares
   * `helix-headless-`. Without this override the chart puts a
   * `helix-headless-tooltip` in its shadow root: the behavior with none of the
   * surface, so the reading bubble falls back to the browser's popover defaults,
   * a white 1.5px border, square corners, `0.25em` of padding and the page's
   * font size, and looks like no other tooltip on the site.
   */
  static override tier = 'helix-'

  /**
   * How strongly the columns are drawn.
   *
   * The chart's treatment, which every series takes unless `outlined` or
   * `subtle` names it. `outlined` is a faded mark with its edge, `subtle` a wash
   * of the series color with that edge on it, and absent is the filled column,
   * per the rule that a reflected property takes no default.
   *
   * `solid` is that filled column written out. It matches no rule in the sheet
   * and lands on the base one, which is what the resting value of every axis in
   * the registry does, and it is worth having so a consumer switching a chart
   * between treatments has a word for the one it started at rather than having
   * to remove the attribute.
   *
   * **It composes with `material` rather than competing with it.** Emphasis
   * decides what is drawn and material decides how much of it comes through, so
   * `glass` thins whatever emphasis put there: the fill on a solid column, the
   * stroke on an outlined one. Without that the corner is inert, `glass` setting
   * a fill opacity on a mark whose fill is `none`, and a combination that
   * silently does nothing is the worst shape this can take.
   */
  @property({ reflect: true })
  emphasis?: 'outlined' | 'solid' | 'subtle'

  /**
   * The material the columns are drawn in. Leave it unset for solid columns, or
   * set `glass` or `frosted`.
   *
   * **A third axis on the chart, not on the bar.** A bar is a mark inside a
   * drawing and nobody writes markup for one; the chart is what a consumer
   * addresses, so the choice belongs here and reaches every column at once.
   *
   * `glass` lets the gridlines read through the columns, which is what puts a
   * chart in the same language as a glass header rather than leaving it the one
   * opaque slab on the page.
   *
   * **`gradient` belongs to `wash` and never here (#156).** The two set
   * different properties, `fill-opacity` against `fill`, and a chart forced into
   * both renders as a translucent gradient that is distinct from either: one
   * enum holding two independent things.
   *
   * Absent is solid, per the rule that a reflected property takes no default,
   * so the stylesheet describes only the departure. The strength is the
   * theme's: `glass` scales with `--helix-material-opacity`, so a language that
   * is more see-through everywhere is more see-through here.
   *
   * Styled rather than headless, because what a bar is filled with is a
   * treatment and this tier is where treatments live. The gradient it points at
   * is drawn below, which is an element and therefore that tier's business.
   *
   * **This paints a mark rather than a ground, and the axis still reads the
   * same way.** On a surface the points are how much of the page shows through;
   * on a series they are how much ink the mark has, and the order is the same:
   * `glass` admits most, `frosted` admits less, absent is opaque. The two
   * factors, 0.72 and 0.88, are the tokens a glass and a frosted surface read,
   * `material-glass-opacity` and `material-frosted-opacity`, so a chart and a
   * card mean the same thing by the word.
   *
   * **`transparent` is where this one stops.** A mark with no ink is not a
   * material choice, it is an absent series, and a chart says that by not
   * having the datum rather than by painting it invisibly.
   */
  @property({ reflect: true })
  material?: 'frosted' | 'glass'

  /**
   * How a column's fill is distributed across it.
   *
   * `gradient` fades each column toward its base, into the wash the headless
   * tier draws whether or not anything points at it.
   *
   * **A chart-domain axis and deliberately not a library one.** It lives on this
   * family alone, and here it is a way of encoding data rather than a way of
   * expressing a theme: promoted to the registry it would put an attribute on
   * every component in the library and mean something on one. `wash` because
   * that is what the tier below already calls it, in `--chart-bar-wash` and in
   * the `bar-wash-start` and `bar-wash-end` stops.
   */
  @property({ reflect: true })
  wash?: 'gradient'

  static override styles: CSSResultGroup = [
    seriesStyles,
    statusStyles,
    tooltipStyles,
    styles,
    sonifyStyles,
    statusMarkStyles,
  ]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-bar-chart': HelixBarChart
  }
}
