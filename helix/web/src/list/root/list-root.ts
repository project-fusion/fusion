import { customElement } from '@helix-io/core'
import { HelixBaseList } from '@helix-io/headless/list'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './list-root.css.js'

/**
 * @summary A set of rows, read as a set.
 *
 * @description
 * Rules between rows rather than around each one, so a list reads as one object
 * with divisions instead of as a stack of cards. `divided` is off by default,
 * because space alone separates rows perfectly well and a rule at every seam is
 * decoration doing what emptiness already does.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Rows, Stack, Menu
 * @documentation https://helix.fusion.dev/components/list
 *
 * @cssproperty --list-gap - Space between rows.
 * @cssproperty --list-marker-gutter - Room the ordered and unordered markers hang into.
 */
@customElement('helix-list')
export class HelixList extends HelixBaseList {
  /** Whether a rule sits between rows. */
  @property({ reflect: true, type: Boolean })
  divided = false

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-list': HelixList
  }
}
