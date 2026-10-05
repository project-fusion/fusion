import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessLineChart } from '@fusion.dev/helix-headless/line-chart'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as seriesStyles } from '../../shared/chart/series.css.js'
import { styles as terminusStyles } from '../../shared/chart/terminus.css.js'
import { styles as tooltipStyles } from '../../shared/chart/tooltip.css.js'
import { styles } from './line-chart-root.css.js'
import '../../tooltip/index.js'

/**
 * @summary A chart that draws series over time as lines, read from a table.
 *
 * @description
 * The lines take the series palette in order. A chart of one series uses series
 * one, a chart of four uses the first four, and a legend beside it maps the
 * same twenty-four.
 *
 * The stroke width stays the same at any size. The drawing uses
 * `preserveAspectRatio="none"` to fill a narrow card or a wide panel, and
 * `vector-effect: non-scaling-stroke` keeps the line from turning hairline in
 * one and heavy in the other. That applies to strokes only: a circle in the
 * stretched drawing becomes an ellipse, so nothing inside the drawing marks a
 * reading.
 *
 * `terminus` marks the last reading of each series with an HTML element placed
 * over the plot by percentage, so it keeps its shape at any width. It is on by
 * default, as a dot, because the far edge is where you look for the current
 * value.
 *
 * @since 0.1.0
 * @status stable
 * @category charts
 * @groups charts
 * @aliases Time Series, Trend Chart, Multi-line Chart
 * @documentation https://fusion.dev/helix/components/line-chart
 *
 * @cssproperty --chart-stroke - Thickness of a series drawn as a line. Line Chart, Area Chart's top edge, and Bar Chart's `lines` all read this one property. Each family's own width property overrides it.
 *   family, Area Chart's top edge and Bar Chart's `lines`, since the three read one shared
 *   rule. Each family's own width hook overrides it.
 * @cssproperty --chart-terminus-hole - Fill for the middle of a `ring` terminus, which is otherwise open. Line Chart and Sparkline share this property.
 * @cssproperty --chart-terminus-size - Size of the mark on each series' last reading. Line Chart and Sparkline share this property.
 * @cssproperty --line-chart-area-opacity - How much of a line's color its wash takes.
 * @cssproperty --line-chart-band-color - Color of the band around the reading under the pointer.
 * @cssproperty --line-chart-block-size - Height of the drawing.
 * @cssproperty --line-chart-gap - Space between the drawing and its labels.
 * @cssproperty --line-chart-gridline-color - Color of the rules drawn across the plot under `gridlines`.
 * @cssproperty --line-chart-marker-ring-color - Color of the ring round the mark on a reading, which matches the page. Change it when the chart sits on another surface.
 * @cssproperty --line-chart-marker-size - Size of the mark on a reading, under `markers`.
 * @cssproperty --line-chart-width - Thickness of a line. Overrides `--chart-stroke`.
 */
@customElement('helix-line-chart')
export class HelixLineChart extends HelixHeadlessLineChart {
  /**
   * The tag prefix for child elements. Set to the styled tier, so the chart
   * renders the styled tooltip.
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
   * How strongly the lines and their washes are drawn.
   *
   * `subtle` mixes each series toward the page, so a chart that is context stays
   * legible without competing. Toward the page rather than translucent, because a
   * translucent line takes its color from whatever it crosses, which on a chart
   * with several is the whole risk.
   *
   * `outlined` thins the wash and leaves the line at full weight, so the boundary
   * carries the reading, which is the trade `BarChart` makes on a column. `solid`
   * takes the wash to full strength and the fill carries it instead.
   *
   * **`outlined` is not `area` said twice**, which is the confusion to hold off:
   * `area` decides whether a wash is drawn at all, which is structural and
   * belongs to the tier below, and emphasis decides which of the two marks is
   * carrying the reading. Both ends of emphasis need a wash present and neither
   * can summon one.
   *
   * `ghost` would be a chart with no lines.
   */
  @property({ reflect: true })
  emphasis?: 'outlined' | 'solid' | 'subtle'

  /**
   * How translucent the lines are, as a material: `glass` or `frosted`.
   *
   * `glass` lets the gridlines read through them, which is what translucency is
   * for on a chart rather than decoration.
   *
   * On the lines and not the wash: the wash is already scaled by
   * `--helix-material-opacity` whatever this says, being a wash by nature, and
   * scaling it twice would compound the policy against itself.
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

  static override styles: CSSResultGroup = [seriesStyles, tooltipStyles, terminusStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-line-chart': HelixLineChart
  }
}
