import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessDonutChart } from '@fusion.dev/helix-headless/donut-chart'
import type { CSSResultGroup, PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as motionStyles } from '../../shared/chart/motion.css.js'
import { styles as seriesStyles } from '../../shared/chart/series.css.js'
import { styles as sonifyStyles } from '../../shared/chart/sonify.css.js'
import { styles as statusStyles } from '../../shared/chart/status.css.js'
import { styles as statusMarkStyles } from '../../shared/chart/status-mark.css.js'
import { styles as tooltipStyles } from '../../shared/chart/tooltip.css.js'
import { styles } from './donut-chart-root.css.js'
import '../../tooltip/index.js'

/**
 * @summary A chart that shows parts of a whole as a ring, read from a table.
 *
 * @description
 * The slices take the series palette in order, so a legend beside the chart
 * uses the same twenty-four colors.
 *
 * The ring starts at twelve o'clock. The styled tier applies that as a
 * rotation.
 *
 * A track is drawn under the slices, so when the values do not fill the ring,
 * the gap shows as part of the ring.
 *
 * @since 0.1.0
 * @status stable
 * @category charts
 * @groups charts
 * @aliases Pie Chart, Ring Chart, Share Chart
 * @use Parts of one whole, such as sessions by source, with a total in the middle.
 * @instead bar-chart - Many parts, or parts close in size that you compare.
 * @instead area-chart - Parts of a whole as they change over time.
 * @instead meter - One measurement against its full range, such as disk used.
 * @anatomy segment
 * @anatomy center
 * @practice Set the ring's thickness with `hole`. - The stroke width and the ring's radius must agree, so no CSS hook sets it.
 * @practice Point `for` at a table with one row per slice, its amount in the first column of numbers. - A donut divides one whole, so it reads one column where other Helix charts read one per series.
 * @documentation https://fusion.dev/design/components/donut-chart
 *
 * @cssproperty --chart-glide-duration - How long the tooltip takes to glide from one slice to the next, along `--helix-easing-decelerate`, as the pointer or the keys move. Defaults to `--helix-duration-fast`. `0s` places it at once, and under reduced motion it moves at once, whatever it says. It is placed where its reading is when a reading is shown from none. Bar Chart, Line Chart, Area Chart, Donut Chart, Scatter Chart, Sparkline, and Heatmap share this property.
 * @cssproperty --chart-move-duration - How long a mark takes to move to a new reading. Defaults to `--helix-duration-normal`. `0s` moves nothing, and under reduced motion nothing moves, whatever it says. Bar Chart, Line Chart, Area Chart, Donut Chart, Scatter Chart, Sparkline, and Heatmap share this property.
 * @cssproperty --chart-move-easing - The curve a mark moves to a new reading along. Defaults to `--helix-easing-decelerate`. Bar Chart, Line Chart, Area Chart, Donut Chart, Scatter Chart, Sparkline, and Heatmap share this property.
 * @cssproperty --donut-chart-edge-stroke - Thickness of the slice boundary under `outlined`.
 * @cssproperty --donut-chart-size - Width and height of the ring.
 * @cssproperty --donut-chart-slice-label-background-color - Plate behind a slice's share, under `slice-labels`.
 * @cssproperty --donut-chart-slice-label-color - Color of a slice's share, under `slice-labels`.
 * @cssproperty --donut-chart-slice-label-font-size - Size of a slice's share, under `slice-labels`.
 * @cssproperty --donut-chart-track-color - Color of the ring under the slices.
 *
 * @cssstate has-error-content - Something is slotted into `error`, so the error line is not cut short.
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
   * How strongly the slices are drawn.
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
   * **Says whether the page slotted something into `error`**, such as a button
   * that tries again. The words in the hole end in an ellipsis after three
   * lines, and a clamped line hides whatever follows it, so with something
   * slotted the line is drawn whole and the button stays. Read after every
   * render, which draws the slot, and on `slotchange`.
   */
  private readonly readError = (): void => {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="error"]')
    this.toggleState(
      'has-error-content',
      (slot?.assignedNodes() ?? []).some(
        (node) => node.nodeType === Node.ELEMENT_NODE || node.textContent?.trim() !== '',
      ),
    )
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.renderRoot.addEventListener('slotchange', this.readError)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.renderRoot.removeEventListener('slotchange', this.readError)
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed)
    this.readError()
  }

  static override styles: CSSResultGroup = [
    motionStyles,
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
    'helix-donut-chart': HelixDonutChart
  }
}
