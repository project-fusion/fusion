import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSpatialSurfaceChart } from '@fusion.dev/helix-headless/spatial-surface-chart'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as sonifyStyles } from '../../shared/chart/sonify.css.js'
import { styles as tooltipStyles } from '../../shared/chart/tooltip.css.js'
import { styles } from './spatial-surface-chart-root.css.js'
import '../../tooltip/index.js'

/**
 * @summary A chart that draws a height over a grid as a surface in three dimensions, for a measure that varies over two others.
 *
 * @description
 * The chart draws the surface in 3D in SVG, and `@fusion.dev/helix-plot` can
 * draw it with three.js. Every height is shaded along one
 * ramp from the theme's primary color, quiet where it is low and strong where
 * it is high, so the two drawings agree.
 *
 * @since 0.190.0
 * @status experimental
 * @category charts
 * @groups charts
 * @documentation https://fusion.dev/helix/components/spatial-surface-chart
 *
 * @cssproperty --spatial-surface-chart-block-size - How tall the plot is. By default, three quarters of its width and 22em at most.
 * @cssproperty --spatial-surface-chart-high - The color of the highest reading, which the renderer reads too.
 * @cssproperty --spatial-surface-chart-low - The color of the lowest reading, which the renderer reads too.
 */
@customElement('helix-spatial-surface-chart')
export class HelixSpatialSurfaceChart extends HelixHeadlessSpatialSurfaceChart {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [tooltipStyles, styles, sonifyStyles]

  /**
   * How strongly the surface is drawn, as on every chart.
   *
   * `outlined` is a wireframe in the ramp's colors over a surface faded toward
   * the page, and `subtle` the same wireframe over a faint surface that the
   * grid behind shows through, so a reading the surface hid from this side can
   * be seen. Absent is the filled surface, per the rule that a reflected
   * property takes no default, and `solid` writes it out. A renderer draws the
   * surface the same way.
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
    'helix-spatial-surface-chart': HelixSpatialSurfaceChart
  }
}
