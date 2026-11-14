import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSpatialSurfaceChart } from '@fusion.dev/helix-headless/spatial-surface-chart'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as sonifyStyles } from '../../shared/chart/sonify.css.js'
import { styles as spatialStyles } from '../../shared/chart/spatial.css.js'
import { styles as statusMarkStyles } from '../../shared/chart/status-mark.css.js'
import { styles as tooltipStyles } from '../../shared/chart/tooltip.css.js'
import { styles } from './spatial-surface-chart-root.generated.css.js'
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
 * @use A measure that varies over two others, such as requests by day and hour.
 * @instead heatmap - A reading for each day or hour, colored in a strip.
 * @instead spatial-ribbon-chart - A few separate series over one set of places.
 * @instead spatial-scatter-chart - Rows that each have three measures of their own.
 * @anatomy grid
 * @anatomy face
 * @anatomy tick
 * @documentation https://fusion.dev/helix/components/spatial-surface-chart
 *
 * @cssproperty --spatial-surface-chart-block-size - How tall the plot is. By default, as tall as it is wide and 26em at most.
 * @cssproperty --spatial-surface-chart-high - The color of the highest reading, which the renderer reads too.
 * @cssproperty --spatial-surface-chart-low - The color of the lowest reading, which the renderer reads too.
 * @cssproperty --spatial-surface-chart-move-duration - How long the surface takes to move to a new table's readings. Defaults to `--helix-duration-normal`. `0ms` draws a new table at once.
 * @cssproperty --spatial-surface-chart-move-easing - The curve the surface moves to new readings along. Defaults to `--helix-easing-decelerate`, so the surface slows as it arrives and never passes its reading.
 */
@customElement('helix-spatial-surface-chart')
export class HelixSpatialSurfaceChart extends HelixHeadlessSpatialSurfaceChart {
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

  static override tier = 'helix-'

  static override styles: CSSResultGroup = [
    spatialStyles,
    tooltipStyles,
    styles,
    sonifyStyles,
    statusMarkStyles,
  ]

  /**
   * How much of each mark comes through, as on every chart: `glass` admits the
   * most of what is behind it, `frosted` less, and absent is opaque. The
   * strength is the theme's, scaled by `--helix-material-opacity`.
   */
  @property({ reflect: true })
  material?: 'frosted' | 'glass'

  /**
   * What the plot stands on. `plain`, the default, draws nothing behind it, as a
   * flat chart does, so a Card or the page is its ground. `filled` draws the
   * `surface-filled` ground every family takes. `no-box` is a separate choice:
   * it removes the box, grid, numbers, and names.
   */
  @property({ reflect: true })
  separation?: 'filled' | 'plain'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-spatial-surface-chart': HelixSpatialSurfaceChart
  }
}
