import { customElement } from '@helix-io/core'
import { HelixBaseSparkline } from '@helix-io/headless/sparkline'
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
 * One color on the host, read by the line, the wash, the columns and the mark
 * alike, so moving `--sparkline-color` cannot leave parts of one drawing
 * disagreeing.
 *
 * The line's weight is set in `em` rather than pixels, so it grows with the
 * drawing the way the drawing grows with its type. A fixed 1.5px was the first
 * version and left a 200 pixel sparkline wearing a hairline: `vector-effect`
 * keeps a stroke out of the view box's stretch, which is the point, and it also
 * keeps it out of every other reason it might want to be bigger.
 *
 * @since 0.1.0
 * @status experimental
 * @category charts
 * @groups charts
 * @aliases Micro Chart, Trend Line, Inline Chart
 * @documentation https://helix.fusion.dev/components/sparkline
 *
 * @cssproperty --chart-terminus-hole - A fill for the middle of a `ring` terminus, which is otherwise open.
 * @cssproperty --chart-terminus-size - Size of the mark on the last reading.
 * @cssproperty --sparkline-area-opacity - How much of the line's color the wash takes where it meets the line.
 * @cssproperty --sparkline-bar-radius - Corner radius on a column, under `plot="bar"`.
 * @cssproperty --sparkline-block-size - Height of the drawing.
 * @cssproperty --sparkline-color - Color of the line, the wash, the columns and the mark.
 * @cssproperty --sparkline-inline-size - Width of the drawing.
 * @cssproperty --sparkline-width - Thickness of the line, overriding `weight`.
 */
@customElement('helix-sparkline')
export class HelixSparkline extends HelixBaseSparkline {
  static override styles: CSSResultGroup = [terminusStyles, styles]

  /**
   * How heavy the line is drawn.
   *
   * Absent is the weight a sparkline is usually drawn at. `thin` suits one set
   * in a table row among many; `thick` suits one standing on its own, where a
   * hairline reads as an accident.
   *
   * Three steps rather than a number, because `--sparkline-width` is already
   * the number and an attribute earns its place by being the thing a consumer
   * reaches for without reading the stylesheet. The hook stays for anything the
   * three do not cover.
   */
  @property({ reflect: true })
  weight?: 'thick' | 'thin'

  /**
   * The shape of the mark on the last reading.
   *
   * Absent is a dot, which is how a line is usually ended, and absent rather
   * than defaulted because a reflecting property with a default writes its
   * attribute onto a host the consumer rendered, which React reports as a
   * hydration mismatch.
   *
   * `none` lets the line stop on its own, which suits a series read as a shape
   * rather than for where it finished. `ring` lets the ground through, for a
   * chart drawn over something busy. `triangle` points along the axis and reads
   * as "and onward" rather than as a second claim about the data.
   *
   * A `bar` plot draws none of them: the last column already is the last
   * reading, and a mark on top of it would say the same thing twice.
   *
   * The shapes come from `helix/web/src/chart/terminus.css`, shared with every other chart
   * that ends a line, so the set is the same wherever one appears. `ring` is the
   * one that asks anything of the drawing: the disc it leaves open is masked out
   * of the `<svg>`, so the line stops at the ring's inner edge rather than
   * running on to the reading at its center, and the middle shows whatever the
   * chart is drawn over rather than a guess at it.
   */
  @property({ reflect: true })
  terminus?: 'none' | 'ring' | 'square' | 'triangle'
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sparkline': HelixSparkline
  }
}
