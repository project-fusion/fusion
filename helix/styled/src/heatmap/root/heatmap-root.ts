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
 */
@customElement('helix-heatmap')
export class HelixHeatmap extends HelixHeadlessHeatmap {
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-heatmap': HelixHeatmap
  }
}
