import { customElement } from '@helix-io/core'
import { HelixBasePaginationSize } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './pagination-size.css.js'

/**
 * @summary Chooses how many items a page holds.
 *
 * @description
 * The trigger wears the same frame every field wears, so a closed one is
 * indistinguishable from a `Select`. What differs is only what happens while it
 * is open, which for a list of four numbers is the half the platform does
 * better: a wheel on a phone, and the widget a screen-reader user already
 * knows.
 *
 * The label is on the row rather than above it. Every other field stacks its
 * label because it stands in a column of fields; this one stands in a footer,
 * where a two-line control makes the whole row two lines tall.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Page size, Rows per page
 * @documentation https://helix.fusion.dev/components/pagination
 *
 * @csspart label - The words naming the control.
 * @csspart control - The select itself.
 */
@customElement('helix-pagination-size')
export class HelixPaginationSize extends HelixBasePaginationSize {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-pagination-size': HelixPaginationSize
  }
}
