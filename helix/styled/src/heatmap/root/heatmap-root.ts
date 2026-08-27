import { customElement } from '@helix-io/core'
import { HelixHeadlessHeatmap } from '@helix-io/headless/heatmap'
import type { CSSResultGroup } from 'lit'
import { styles } from './heatmap-root.css.js'

/**
 * @summary A strip of cells coloured by how each one went: uptime, contributions, activity.
 *
 * @description
 * One grid, filled down the column and then across, which is what a calendar
 * heatmap is: a week is a column, so the strip reads left to right in weeks and
 * top to bottom in days. `rows="1"` makes it a single row without a second
 * layout.
 *
 * An empty cell takes the quietest ground the palette has rather than being
 * transparent. A strip of holes reads as a broken picture; a strip of empty
 * cells reads as a period with nothing in it, which is what it is.
 *
 * **This tier is what a tone name is worth.** `tones="success"` and
 * `data-tone="danger"` reach the theme's status colors; `tones="1 2 3 4 5"`
 * reaches a five step ramp of one hue, which is the only thing a reader can
 * compare two cells by. Both are hooks, so a page may answer differently.
 *
 * @since 0.1.0
 * @status experimental
 * @category charts
 * @documentation https://helix.fusion.dev/components/heatmap
 *
 * @slot - The `<table>` this draws, where it is not named by `for`.
 * @slot start - Below the strip, at the leading edge.
 * @slot summary - Below the strip, in the middle.
 * @slot end - Below the strip, at the trailing edge.
 *
 * @csspart strip - The grid of cells.
 * @csspart cell - One reading.
 * @csspart footer - The three-slot row under the strip.
 *
 * @cssproperty --heatmap-cell-size - The size a cell wants. The strip fits as many as the container allows.
 * @cssproperty --heatmap-gap - Space between cells.
 * @cssproperty --heatmap-cell-radius - How far a cell's corners are rounded.
 * @cssproperty --heatmap-tone-success - What `success` is worth, as a name or a `data-tone`.
 * @cssproperty --heatmap-tone-warning - What `warning` is worth.
 * @cssproperty --heatmap-tone-danger - What `danger` is worth.
 * @cssproperty --heatmap-tone-info - What `info` is worth.
 * @cssproperty --heatmap-tone-accent - What `accent` is worth.
 * @cssproperty --heatmap-tone-primary - What `primary` is worth.
 * @cssproperty --heatmap-tone-muted - What `muted` is worth: the quiet ground, for a bucket that means nothing happened.
 * @cssproperty --heatmap-tone-1 - The quietest step of the magnitude ramp, reached by `tones="1 …"`.
 * @cssproperty --heatmap-tone-2 - The second step of the magnitude ramp.
 * @cssproperty --heatmap-tone-3 - The third step of the magnitude ramp.
 * @cssproperty --heatmap-tone-4 - The fourth step of the magnitude ramp.
 * @cssproperty --heatmap-tone-5 - The loudest step of the magnitude ramp.
 */
@customElement('helix-heatmap')
export class HelixHeatmap extends HelixHeadlessHeatmap {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles

  /**
   * What the sheet beside this actually draws, in the pixels the fit arithmetic
   * counts in.
   *
   * **The base tier's numbers are a bare strip's and this tier draws something
   * bigger, so somebody has to say so.** `fits()` works against a measured width
   * and cannot resolve `--helix-space-2xs`; this sheet chose that gap and a
   * `0.75rem` cell, so this is the one place that knows both halves. Left at the
   * inherited 8 and 2, the arithmetic believed a cell cost 10 pixels where it
   * cost 16: measured 27 Aug 2026, a ninety day strip drew 940 pixels of cells
   * into a 592 pixel box at 640 and 540 into 342 at 390, overflowing the
   * document both times, while `visible` reported 59 and 34. The number a
   * summary is told to trust was the number that was wrong, which is the exact
   * failure the property exists to prevent.
   *
   * A consumer who moves `--heatmap-cell-size` or `--heatmap-gap` sets `min-cell`
   * and `gap` to match, and the attributes are how they say it.
   */
  override gap = 4

  /** The drawn cell, for the reason `gap` is the drawn gap. `0.75rem` at the root font size. */
  override minCell = 12
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-heatmap': HelixHeatmap
  }
}
