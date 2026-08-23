import { customElement } from '@helix-io/core'
import { HelixBaseBreadcrumbs } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './breadcrumbs-root.css.js'

/**
 * @summary Shows the path to the current page.
 *
 * @description
 * A single wrapping line by default. The trail wraps rather than scrolling,
 * because a truncated path tells the reader less than a two-line one.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Breadcrumb, Crumbs
 * @documentation https://helix.fusion.dev/components/breadcrumbs
 *
 * @slot - The trail's items, in order from root to current page.
 *
 * @csspart list - The ordered list.
 *
 * @cssproperty --breadcrumbs-gap - Space between items and separators.
 */
@customElement('helix-breadcrumbs')
export class HelixBreadcrumbs extends HelixBaseBreadcrumbs {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-breadcrumbs': HelixBreadcrumbs
  }
}
