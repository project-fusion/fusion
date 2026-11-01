import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSpatialScatterChart } from '@fusion.dev/helix-headless/spatial-scatter-chart'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as seriesStyles } from '../../shared/chart/series.css.js'
import { styles as sonifyStyles } from '../../shared/chart/sonify.css.js'
import { styles as spatialStyles } from '../../shared/chart/spatial.css.js'
import { styles as tooltipStyles } from '../../shared/chart/tooltip.css.js'
import { styles } from './spatial-scatter-chart-root.css.js'
import '../../tooltip/index.js'

/**
 * @summary A chart that plots each row as a point in three dimensions, for data with three measures.
 *
 * @description
 * The chart draws the points in 3D in SVG, and `@fusion.dev/helix-plot` can
 * draw them with three.js. Each group takes a series color from the theme, as
 * every chart's series does, in both drawings.
 *
 * @since 0.190.0
 * @status experimental
 * @category charts
 * @groups charts
 * @documentation https://fusion.dev/helix/components/spatial-scatter-chart
 *
 * @cssproperty --spatial-scatter-chart-block-size - How tall the plot is. By default, three quarters of its width and 22em at most.
 */
@customElement('helix-spatial-scatter-chart')
export class HelixSpatialScatterChart extends HelixHeadlessSpatialScatterChart {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [spatialStyles, seriesStyles, tooltipStyles, styles, sonifyStyles]

  /**
   * How strongly the points are drawn, as on every chart.
   *
   * `outlined` is a point as a ring in its group's color over a dot faded
   * toward the page, and `subtle` the same ring over a faint dot. Absent is
   * the filled dot, per the rule that a reflected property takes no default,
   * and `solid` writes it out. A renderer draws the points the same way.
   *
   * It composes with `material`: emphasis decides what is drawn, and material
   * how much of it comes through. The ring on the point the keys rest on keeps
   * its own ink.
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
    'helix-spatial-scatter-chart': HelixSpatialScatterChart
  }
}
