import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessSparkline } from '@fusion.dev/helix-headless/sparkline'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as terminusStyles } from '../../shared/chart/terminus.css.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './sparkline-root.css.js'

/**
 * @summary A small chart with no axes that shows the shape of a series beside its number.
 *
 * @description
 * Sized in `em` by default, so it scales with the text around it: figure-sized
 * beside a figure, and row-sized in a table row.
 *
 * `preserveAspectRatio="none"` lets one drawing fill a 60px slot or a 600px
 * one, and `vector-effect: non-scaling-stroke` keeps the stroke from stretching
 * with it. The line's weight is set in `em`, so it grows with the drawing's
 * text size.
 *
 * Set `--sparkline-color` on the host to color the line, the fill, the columns,
 * and the mark together.
 *
 * @since 0.1.0
 * @status stable
 * @category charts
 * @groups charts
 * @aliases Micro Chart, Trend Line, Inline Chart
 * @documentation https://fusion.dev/helix/components/sparkline
 *
 * @cssproperty --chart-terminus-hole - A fill for the middle of a `ring` terminus. Without it, the middle is open.
 * @cssproperty --chart-terminus-size - Size of the mark on the last reading.
 * @cssproperty --sparkline-area-opacity - Opacity of the area fill where it meets the line.
 * @cssproperty --sparkline-bar-radius - Corner radius of a column, when `plot="bar"`.
 * @cssproperty --sparkline-bar-stroke - Thickness of a column's edge when `emphasis` is `outlined`.
 * @cssproperty --sparkline-block-size - Height of the drawing.
 * @cssproperty --sparkline-color - Color of the line, the area fill, the columns, and the mark.
 * @cssproperty --sparkline-inline-size - Width of the drawing.
 * @cssproperty --sparkline-mark-color - Color of the dot on the reading a pointer or a key rests on, and of the `marks` dots. Without it, the line's color.
 * @cssproperty --sparkline-mark-ring-color - Color of the ring round the dot on the reading a pointer or a key rests on, which matches the page. Change it when the sparkline sits on another surface.
 * @cssproperty --sparkline-mark-size - Size of the dot on the reading a pointer or a key rests on, and of the `marks` dots.
 * @cssproperty --sparkline-range-color - Fill of the band `range` draws. Without it, the line's color.
 * @cssproperty --sparkline-range-opacity - Opacity of the band `range` draws.
 * @cssproperty --sparkline-readout-background-color - Ground of the reading written above the dot.
 * @cssproperty --sparkline-readout-color - Color of the reading written above the dot.
 * @cssproperty --sparkline-readout-font-size - Size of the reading written above the dot.
 * @cssproperty --sparkline-width - Thickness of the line, overriding `weight`.
 */
@customElement('helix-sparkline')
export class HelixSparkline extends HelixHeadlessSparkline {
  /**
   * How strongly the line, area, or columns are drawn.
   *
   * `subtle` mixes the drawing toward the page. The case is a table where one row
   * is being read and the rest are context.
   *
   * It moves the host's `color`, which is what every mark here is drawn in: the
   * line strokes it, both gradient stops take it so the wash is the line's own
   * color, and the terminus fills it. So one declaration quietens all of them,
   * and a consumer's `--sparkline-color` is quietened rather than replaced.
   *
   * **The other two follow whichever plot is drawn**, because a sparkline is
   * three marks behind one property and the difference between a boundary and a
   * fill does not exist until you know which. A `bar` plot answers like
   * `BarChart`, an `area` or `line` plot like `LineChart`. `solid` on bars is the
   * resting column and selects nothing.
   *
   * `outlined` needs a fill to remove, so it applies to `bar` and `area` and
   * says nothing about a bare line.
   *
   * `ghost` is an empty cell and there is no `material`. Glass exists so what is
   * behind a mark reads through it, and at the size a sparkline draws there is
   * nothing behind it a reader could resolve.
   */
  @property({ reflect: true })
  emphasis?: 'outlined' | 'solid' | 'subtle'

  static override styles: CSSResultGroup = [liveStyles, terminusStyles, styles]

  /**
   * The shape of the mark on the last reading.
   *
   * Absent is a dot, which is how a line is usually ended, and absent rather
   * than defaulted because a reflecting property with a default writes its
   * attribute onto a host the consumer rendered, which React reports as a
   * hydration mismatch.
   *
   * `none` lets the line stop on its own, which suits a series read as a shape
   * rather than for where it finished. `square` is the same mark with its
   * corners, for a drawing whose neighbors are square, columns in the table
   * beside it for instance. `ring` lets the ground through, for a chart drawn
   * over something busy. `triangle` points along the axis and reads as "and
   * onward" rather than as a second claim about the data.
   *
   * A `bar` plot draws none of them: the last column already is the last
   * reading, and a mark on top of it would say the same thing twice.
   *
   * The shapes come from `helix/styled/src/shared/chart/terminus.css`, shared with
   * `LineChart`, so the set is the same wherever a line ends. `ring` is the
   * one that asks anything of the drawing: the disc it leaves open is masked out
   * of the `<svg>`, so the line stops at the ring's inner edge rather than
   * running on to the reading at its center, and the middle shows whatever the
   * chart is drawn over rather than a guess at it.
   */
  @property({ reflect: true })
  terminus?: 'none' | 'ring' | 'square' | 'triangle'

  /**
   * How thick the line is drawn.
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
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sparkline': HelixSparkline
  }
}
