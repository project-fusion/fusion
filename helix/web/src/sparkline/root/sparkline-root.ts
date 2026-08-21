import { customElement } from '@helix-io/core'
import { HelixBaseSparkline } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './sparkline-root.css.js'

/**
 * @summary A line with no axes, for the shape of a series beside the number it belongs to.
 *
 * @description
 * Sized in `em` by default, so a sparkline set beside a figure is a figure-sized
 * thing and one set in a table row is a row-sized thing. The type scale is
 * absolute and cannot say "a little wider than this".
 *
 * The stroke does not scale with the box. `preserveAspectRatio="none"` is what
 * lets one drawing fill a 60px slot and a 600px one, and without
 * `vector-effect: non-scaling-stroke` the same line comes out hairline in the
 * first and heavy in the second.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Micro Chart, Trend Line, Inline Chart
 * @documentation https://helix.fusion.dev/components/sparkline
 *
 * @cssproperty --sparkline-area-opacity - How much of the line's colour the fill takes.
 * @cssproperty --sparkline-block-size - Height of the drawing.
 * @cssproperty --sparkline-color - Colour of the line and the mark.
 * @cssproperty --sparkline-inline-size - Width of the drawing.
 * @cssproperty --sparkline-point-size - Diameter of the mark on the last value.
 * @cssproperty --sparkline-width - Thickness of the line.
 */
@customElement('helix-sparkline')
export class HelixSparkline extends HelixBaseSparkline {
  static override styles: CSSResultGroup = styles

  /**
   * Whether the region under the line is filled.
   *
   * Absent is the line alone, which is the sparkline that sits in a line of
   * text. `area` fills the region beneath it, which reads as a silhouette and
   * carries better at small sizes and from further away, at the cost of the
   * exact path being harder to follow where two of them are compared.
   *
   * The fill is a wash of the line's own colour rather than a second one, so a
   * consumer setting `--sparkline-color` moves both and cannot end up with a
   * fill that disagrees with the line above it.
   */
  @property({ reflect: true })
  appearance?: 'area'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sparkline': HelixSparkline
  }
}
