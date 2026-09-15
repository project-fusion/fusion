import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessHeatmap } from '@fusion.dev/helix-headless/heatmap'
import type { CSSResultGroup } from 'lit'
import { styles } from './heatmap-root.css.js'
import '../../tooltip/index.js'

/**
 * @summary A strip of cells colored by how each one went: uptime, contributions, activity.
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
 * @status experimental
 * @category charts
 * @documentation https://helix.fusion.dev/components/heatmap
 *
 * @slot - The `<table>` this draws, where it is not named by `for`.
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
 * @csspart tooltip-arrow-bottom - The point while the bubble is below the reading, so on its top edge, beside `tooltip-arrow`.
 * @csspart tooltip-arrow-left - The point while the bubble is left of the reading, so on its right edge, beside `tooltip-arrow`.
 * @csspart tooltip-arrow-right - The point while the bubble is right of the reading, so on its left edge, beside `tooltip-arrow`.
 * @csspart tooltip-arrow-top - The point while the bubble is above the reading, so on its bottom edge, beside `tooltip-arrow`.
 * @csspart tooltip-bottom - The bubble while it is below the reading, beside `tooltip`.
 * @csspart tooltip-cell - One column's name and value inside the tooltip.
 * @csspart tooltip-label - The reading's own name inside the tooltip.
 * @csspart tooltip-left - The bubble while it is left of the reading, beside `tooltip`.
 * @csspart tooltip-name - A column's name inside the tooltip.
 * @csspart tooltip-right - The bubble while it is right of the reading, beside `tooltip`.
 * @csspart tooltip-top - The bubble while it is above the reading, beside `tooltip`.
 * @csspart tooltip-value - A column's value inside the tooltip.
 *
 * @cssproperty --heatmap-cell-height - How tall a cell is. A row of a tall thin cell is what a status page draws.
 * @cssproperty --heatmap-cell-inline-size - How wide a cell is. The strip fits as many as the container allows.
 * @cssproperty --heatmap-cell-radius - How far a cell's corners are rounded.
 * @cssproperty --heatmap-cell-size - The size a cell wants on both axes, where neither is given its own.
 * @cssproperty --heatmap-gap - Space between cells. Zero is a continuous field rather than a grid of tiles.
 * @cssproperty --heatmap-tone-1 - The quietest step of the magnitude ramp, reached by `tones="1 …"`.
 * @cssproperty --heatmap-tone-2 - The second step of the magnitude ramp.
 * @cssproperty --heatmap-tone-3 - The third step of the magnitude ramp.
 * @cssproperty --heatmap-tone-4 - The fourth step of the magnitude ramp.
 * @cssproperty --heatmap-tone-5 - The loudest step of the magnitude ramp.
 * @cssproperty --heatmap-tone-accent - What `accent` is worth.
 * @cssproperty --heatmap-tone-danger - What `danger` is worth.
 * @cssproperty --heatmap-tone-info - What `info` is worth.
 * @cssproperty --heatmap-tone-muted - What `muted` is worth: the quiet ground, for a bucket that means nothing happened.
 * @cssproperty --heatmap-tone-primary - What `primary` is worth.
 * @cssproperty --heatmap-tone-success - What `success` is worth, as a name or a `data-tone`.
 * @cssproperty --heatmap-tone-warning - What `warning` is worth.
 */
@customElement('helix-heatmap')
export class HelixHeatmap extends HelixHeadlessHeatmap {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles

  /**
   * The first guess at what this sheet draws, before it has been measured.
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

  /** The drawn cell width, for the reason `gap` is the drawn gap. `0.75rem` at the root font size. */
  override minCell = 12
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-heatmap': HelixHeatmap
  }
}
