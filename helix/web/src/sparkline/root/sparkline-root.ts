import { customElement } from '@helix-io/core'
import { HelixBaseSparkline } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as terminusStyles } from '../../chart/terminus.css.js'
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
 * One colour on the host, read by the line, the wash and the mark alike, so
 * moving `--sparkline-color` cannot leave three parts of one drawing
 * disagreeing.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Micro Chart, Trend Line, Inline Chart
 * @documentation https://helix.fusion.dev/components/sparkline
 *
 * @cssproperty --chart-terminus-size - Size of the mark on the last reading.
 * @cssproperty --sparkline-area-opacity - How much of the line's colour the wash takes where it meets the line.
 * @cssproperty --sparkline-block-size - Height of the drawing.
 * @cssproperty --sparkline-color - Colour of the line, the wash and the mark.
 * @cssproperty --sparkline-inline-size - Width of the drawing.
 * @cssproperty --sparkline-width - Thickness of the line.
 */
@customElement('helix-sparkline')
export class HelixSparkline extends HelixBaseSparkline {
  static override styles: CSSResultGroup = [terminusStyles, styles]

  /**
   * Whether the region under the line is filled.
   *
   * Absent is the line alone, which is the sparkline that sits in a line of
   * text. `area` washes the region beneath it, which reads as a silhouette and
   * carries better at small sizes and from further away, at the cost of the
   * exact path being harder to follow where two of them are compared.
   *
   * The wash is a ramp of the line's own colour, strongest where it meets the
   * line and gone by the floor of the box. Not a flat fill, because the floor
   * is the edge of the data's own range rather than a true zero, and a fill of
   * even weight down to it draws a hard edge along a number that means nothing.
   */
  @property({ reflect: true })
  appearance?: 'area'

  /**
   * The shape of the mark on the last reading.
   *
   * Absent is a dot, which is how a sparkline is usually ended, and absent
   * rather than defaulted because a reflecting property with a default writes
   * its attribute onto a host the consumer rendered, which React reports as a
   * hydration mismatch.
   *
   * `none` lets the line stop on its own, which suits a series read as a shape
   * rather than for where it finished. `ring` lets the ground through, for a
   * chart drawn over something busy. `triangle` points along the axis and reads
   * as "and onward" rather than as a second claim about the data.
   *
   * The shapes come from `chart/terminus.css`, shared with every other chart
   * that ends a line, so the set is the same wherever one appears.
   */
  @property({ reflect: true })
  terminus?: 'none' | 'ring' | 'square' | 'triangle'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sparkline': HelixSparkline
  }
}
