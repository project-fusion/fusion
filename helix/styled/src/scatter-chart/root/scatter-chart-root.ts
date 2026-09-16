import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessScatterChart } from '@fusion.dev/helix-headless/scatter-chart'
import type { CSSResultGroup } from 'lit'
import { styles as seriesStyles } from '../../shared/chart/series.css.js'
import { styles as tooltipStyles } from '../../shared/chart/tooltip.css.js'
import { styles } from './scatter-chart-root.css.js'
import '../../tooltip/index.js'

/**
 * @summary Whether two measures move together, one point per row.
 *
 * @description
 * The points take the series palette in order, so a table with one column
 * measured up is series one and a table with three is the first three.
 *
 * Each point has a ring of the page around it and stops short of opaque, so a
 * dense cluster reads as dense rather than as one blot, and two points that
 * overlap each keep their edge.
 *
 * **No visual axis applies here, and that is the answer rather than a gap.**
 * Both refusals come out of that sentence, and both were argued in the
 * stylesheet before they were argued anywhere a reader looks.
 *
 * `emphasis` is how much ink a mark claims, and on a scatter that channel is
 * already carrying data. The points rest at 0.8 so that where they pile up they
 * compound: how dark a region is *is* how many rows are in it, which is most of
 * what a reader is looking at a scatter to see and is the one thing a table of
 * the same numbers hides. `solid` flattens a dense cluster and a sparse one into
 * the same picture; `outlined` replaces the pile with overlapping rings, which
 * reads as texture rather than as count. An axis whose two ends each cost the
 * drawing its density is not a treatment, it is a second meaning for a property
 * the chart already spends.
 *
 * `material` is the same refusal said once more. Translucency is the density
 * channel here, so `glass` and `frosted` are two more named stops on a scale
 * the data is using, and a point admitting the page through is a point that
 * counts for less than one.
 *
 * What stays adjustable is `--scatter-chart-point-opacity`, and it is a
 * continuum rather than an axis: a chart drawn over a busier ground wants a
 * different resting density, and that is a fact about the ground rather than a
 * claim about the points.
 *
 * @since 0.1.0
 * @status stable
 * @category charts
 * @groups charts
 * @aliases Scatter Plot, XY Chart, Correlation Chart, Dot Plot
 * @documentation https://fusion.dev/helix/components/scatter-chart
 *
 * @cssproperty --scatter-chart-block-size - Height of the drawing.
 * @cssproperty --scatter-chart-gap - Space between the drawing and its axes.
 * @cssproperty --scatter-chart-gridline-color - One rule across the plot, under `gridlines`.
 * @cssproperty --scatter-chart-point-opacity - How much of its color a point shows, so a cluster reads darker where it is denser.
 * @cssproperty --scatter-chart-point-ring-color - The ring around each point, which is the page's color unless the chart sits on something else.
 * @cssproperty --scatter-chart-point-size - Diameter of a point.
 */
@customElement('helix-scatter-chart')
export class HelixScatterChart extends HelixHeadlessScatterChart {
  /** The styled tier, so the tooltip this renders is the styled one. */
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [seriesStyles, tooltipStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-scatter-chart': HelixScatterChart
  }
}
