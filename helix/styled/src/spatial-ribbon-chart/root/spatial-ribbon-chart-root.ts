import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSpatialRibbonChart } from '@fusion.dev/helix-headless/spatial-ribbon-chart'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as seriesStyles } from '../../shared/chart/series.css.js'
import { styles as tooltipStyles } from '../../shared/chart/tooltip.css.js'
import { styles } from './spatial-ribbon-chart-root.css.js'
import '../../tooltip/index.js'

/**
 * @summary A chart that draws each series as a ribbon in three dimensions, its top following the values, for several series over one set of places.
 *
 * @description
 * Each series takes a series color from the theme, as every chart's series
 * does, and each face of a ribbon is that color darkened by how far it turns
 * from the light. The chart draws the ribbons in 3D in SVG, and
 * `@fusion.dev/helix-plot` can draw them with three.js.
 *
 * @since 0.198.0
 * @status experimental
 * @category charts
 * @groups charts
 * @documentation https://fusion.dev/helix/components/spatial-ribbon-chart
 *
 * @cssproperty --spatial-ribbon-chart-block-size - How tall the plot is.
 */
@customElement('helix-spatial-ribbon-chart')
export class HelixSpatialRibbonChart extends HelixHeadlessSpatialRibbonChart {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [seriesStyles, tooltipStyles, styles]

  /**
   * How strongly the ribbons are drawn, as on every chart.
   *
   * `outlined` is a ribbon as its edges in its series' color over faces
   * faded toward the page, and `subtle` the same edges over a faint wash,
   * which shows the ribbons behind it. Absent is the filled ribbon, per the
   * rule that a reflected property takes no default, and `solid` writes it
   * out. A renderer draws the ribbons the same way.
   *
   * It composes with `material`: emphasis decides what is drawn, and material
   * how much of it comes through. The ring on the reading the keys rest on
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
    'helix-spatial-ribbon-chart': HelixSpatialRibbonChart
  }
}
