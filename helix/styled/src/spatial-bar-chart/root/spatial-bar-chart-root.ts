import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSpatialBarChart } from '@fusion.dev/helix-headless/spatial-bar-chart'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as seriesStyles } from '../../shared/chart/series.css.js'
import { styles as tooltipStyles } from '../../shared/chart/tooltip.css.js'
import { styles } from './spatial-bar-chart-root.css.js'
import '../../tooltip/index.js'

/**
 * @summary A bar chart drawn in three dimensions, each bar a block as tall as its value, for categories in one or more series.
 *
 * @description
 * Each series takes a series color from the theme, as every chart's series
 * does, and each face of a bar is that color darkened by how far it turns
 * from the light. The chart draws the bars in 3D in SVG, and
 * `@fusion.dev/helix-plot` can draw them with three.js.
 *
 * @since 0.199.0
 * @status experimental
 * @category charts
 * @groups charts
 * @documentation https://fusion.dev/helix/components/spatial-bar-chart
 *
 * @cssproperty --spatial-bar-chart-block-size - How tall the plot is. By default, three quarters of its width and 22em at most.
 */
@customElement('helix-spatial-bar-chart')
export class HelixSpatialBarChart extends HelixHeadlessSpatialBarChart {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [seriesStyles, tooltipStyles, styles]

  /**
   * How strongly the bars are drawn, as on every chart.
   *
   * `outlined` is a bar as its edges in its series' color over faces faded
   * toward the page, and `subtle` the same edges over a faint wash, which
   * shows the bars behind it. Absent is the filled bar, per the rule that a
   * reflected property takes no default, and `solid` writes it out. A
   * renderer draws the bars the same way.
   *
   * It composes with `material`: emphasis decides what is drawn, and material
   * how much of it comes through. The outline on the bar the keys rest on
   * keeps its own ink.
   */
  @property({ reflect: true })
  emphasis?: 'outlined' | 'solid' | 'subtle'

  /**
   * How much of each mark comes through, as on every chart: `glass` admits the
   * most of what is behind it, `frosted` less, and absent is opaque. The
   * strength is the theme's, scaled by `--helix-material-opacity`.
   */
  @property({ reflect: true })
  material?: 'frosted' | 'glass'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-spatial-bar-chart': HelixSpatialBarChart
  }
}
