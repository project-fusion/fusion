import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessBreadcrumbs } from '@fusion.dev/helix-headless/breadcrumbs'
import type { CSSResultGroup } from 'lit'
import { styles } from './breadcrumbs-root.css.js'

/**
 * @summary Shows the path to the current page.
 *
 * @description
 * The trail is a single line by default and wraps onto a second line when it
 * runs out of room, so every crumb stays visible.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Breadcrumb, Crumbs
 * @documentation https://fusion.dev/helix/components/breadcrumbs
 *
 * @slot - The trail's items, in order from root to current page.
 *
 * @csspart list - The ordered list.
 *
 * @cssproperty --breadcrumbs-gap - Space between items and separators.
 */
@customElement('helix-breadcrumbs')
export class HelixBreadcrumbs extends HelixHeadlessBreadcrumbs {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-breadcrumbs': HelixBreadcrumbs
  }
}
