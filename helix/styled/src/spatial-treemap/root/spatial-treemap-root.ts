import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSpatialTreemap } from '@fusion.dev/helix-headless/spatial-treemap'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as seriesStyles } from '../../shared/chart/series.css.js'
import { styles as sonifyStyles } from '../../shared/chart/sonify.css.js'
import { styles as spatialStyles } from '../../shared/chart/spatial.css.js'
import { styles as tooltipStyles } from '../../shared/chart/tooltip.css.js'
import { styles } from './spatial-treemap-root.css.js'
import '../../tooltip/index.js'

/**
 * @summary A treemap drawn in three dimensions, each item a block whose area is its size and whose height is a second measure.
 *
 * @description
 * Each group takes a series color from the theme, as every chart's series
 * does, and each face of a block is that color darkened by how far it turns
 * from the light. The chart draws the blocks in 3D in SVG, and
 * `@fusion.dev/helix-plot` can draw them with three.js.
 *
 * @since 0.199.0
 * @status experimental
 * @category charts
 * @groups charts
 * @documentation https://fusion.dev/helix/components/spatial-treemap
 *
 * @cssproperty --spatial-treemap-block-size - How tall the plot is. By default, three quarters of its width and 22em at most.
 */
@customElement('helix-spatial-treemap')
export class HelixSpatialTreemap extends HelixHeadlessSpatialTreemap {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = [
    spatialStyles,
    seriesStyles,
    tooltipStyles,
    styles,
    sonifyStyles,
  ]

  /**
   * How strongly the blocks are drawn, as on every chart.
   *
   * `outlined` is a block as its edges in its group's color over faces faded
   * toward the page, and `subtle` the same edges over a faint wash, which
   * shows the blocks behind it. Absent is the filled block, per the rule that a
   * reflected property takes no default, and `solid` writes it out. A
   * renderer draws the blocks the same way.
   *
   * It composes with `material`: emphasis decides what is drawn, and material
   * how much of it comes through. The outline on the block the keys rest on
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
    'helix-spatial-treemap': HelixSpatialTreemap
  }
}
