import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessHeatmap } from '@fusion.dev/helix-headless/heatmap'
import type { CSSResultGroup } from 'lit'
import { styles } from './heatmap-root.css.js'
import '../../tooltip/index.js'

/**
 * @summary A strip of cells, each colored by its reading, for uptime, contributions, or activity.
 *
 * @description
 * One grid, filled down the column then across: a week is a column, so the strip
 * reads left to right in weeks and top to bottom in days. `rows="1"` makes it a
 * single row.
 *
 * An empty cell takes the palette's quietest ground rather than being
 * transparent, so a gap reads as a period with nothing in it rather than as a
 * hole in the picture.
 *
 * `tones="success"` and `data-tone="danger"` reach the theme's status colors;
 * `tones="1 2 3 4 5"` reaches a five-step ramp of one hue, which is the only
 * thing two cells can be compared by.
 *
 * @since 0.1.0
 * @status stable
 * @category charts
 * @documentation https://fusion.dev/helix/components/heatmap
 *
 * @slot end - Below the strip, at the trailing edge.
 * @slot start - Below the strip, at the leading edge.
 * @slot summary - Below the strip, in the middle.
 *
 * @csspart cell - One reading.
 * @csspart footer - The three-slot row under the strip.
 * @csspart mark - The invisible point the tooltip is anchored to.
 * @csspart strip - The grid of cells.
 * @csspart tooltip - The bubble, forwarded from `Tooltip`.
 * @csspart tooltip-anchor - The `Tooltip` element itself.
 * @csspart tooltip-arrow - The bubble's point, forwarded from `Tooltip`.
 * @csspart tooltip-arrow-bottom - The point while the bubble is below the reading, on its top edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-arrow-left - The point while the bubble is left of the reading, on its right edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-arrow-right - The point while the bubble is right of the reading, on its left edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-arrow-top - The point while the bubble is above the reading, on its bottom edge. Set alongside `tooltip-arrow`.
 * @csspart tooltip-bottom - The bubble while it is below the reading. Set alongside `tooltip`.
 * @csspart tooltip-cell - One column's name and value inside the tooltip.
 * @csspart tooltip-label - The reading's own name inside the tooltip.
 * @csspart tooltip-left - The bubble while it is left of the reading. Set alongside `tooltip`.
 * @csspart tooltip-name - A column's name inside the tooltip.
 * @csspart tooltip-right - The bubble while it is right of the reading. Set alongside `tooltip`.
 * @csspart tooltip-top - The bubble while it is above the reading. Set alongside `tooltip`.
 * @csspart tooltip-value - A column's value inside the tooltip.
 *
 * @cssproperty --heatmap-cell-height - How tall a cell is. One row of tall, narrow cells looks like a status page.
 * @cssproperty --heatmap-cell-inline-size - How wide a cell is. The strip fits as many as the container allows.
 * @cssproperty --heatmap-cell-radius - How far a cell's corners are rounded.
 * @cssproperty --heatmap-cell-size - The size of a cell on both axes, used where neither axis has its own size set.
 * @cssproperty --heatmap-gap - Space between cells. Zero draws one continuous field.
 * @cssproperty --heatmap-tone-1 - The weakest step of the magnitude ramp, used by `tones="1 …"`.
 * @cssproperty --heatmap-tone-2 - The second step of the magnitude ramp.
 * @cssproperty --heatmap-tone-3 - The third step of the magnitude ramp.
 * @cssproperty --heatmap-tone-4 - The fourth step of the magnitude ramp.
 * @cssproperty --heatmap-tone-5 - The strongest step of the magnitude ramp.
 * @cssproperty --heatmap-tone-accent - The color of the `accent` tone.
 * @cssproperty --heatmap-tone-danger - The color of the `danger` tone.
 * @cssproperty --heatmap-tone-info - The color of the `info` tone.
 * @cssproperty --heatmap-tone-muted - The color of the `muted` tone: a quiet background, for a bucket that means nothing happened.
 * @cssproperty --heatmap-tone-primary - The color of the `primary` tone.
 * @cssproperty --heatmap-tone-success - The color of the `success` tone, named in `tones` or in `data-tone`.
 * @cssproperty --heatmap-tone-warning - The color of the `warning` tone.
 */
@customElement('helix-heatmap')
export class HelixHeatmap extends HelixHeadlessHeatmap {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles

  /**
   * The starting estimate of the gap this stylesheet draws, used until the
   * strip is measured.
   *
   * **Not a contract.** `fits()` reads the strip back rather than being told a
   * cell size by hand, so nothing has to be kept in step and
   * `--heatmap-cell-inline-size` on its own is enough. Told by hand, these sat
   * at the base tier's 8 and 2 against a sheet drawing 12 and 4, and the
   * arithmetic believed a cell cost 10 pixels where it cost 16: a ninety day
   * strip drew 940 pixels of cells into a 592 pixel box while `visible`
   * reported 59.
   *
   * These two remain because a measurement arrives one frame after the first
   * paint, and a first paint from numbers that match the sheet is one that does
   * not move.
   */
  override gap = 4

  /**
   * The starting estimate of the cell width this stylesheet draws, for the
   * same reason as `gap`. `0.75rem` at the root font size.
   */
  override minCell = 12
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-heatmap': HelixHeatmap
  }
}
