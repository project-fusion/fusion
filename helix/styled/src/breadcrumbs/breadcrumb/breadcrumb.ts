import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessBreadcrumb } from '@fusion.dev/helix-headless/breadcrumbs'
import type { CSSResultGroup } from 'lit'
import { styles } from './breadcrumb.css.js'

/**
 * @summary One step in a breadcrumb trail.
 *
 * @description
 * The separator is hidden on the first crumb with `:host(:first-child)`, so no
 * crumb needs its index and the parent needs no coordination.
 *
 * The link carries `data-link="quiet"`, the link recipe navigation uses
 * everywhere else, which sets its color. Under the pointer it looks like a
 * subtle button, and that style is set inside the crumb. The base layer sets
 * only color and text-decoration on an anchor, so your styles win for those,
 * and the box and background come from `::slotted`.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Crumb
 * @documentation https://fusion.dev/helix/components/breadcrumbs
 *
 * @slot - The step: a link, or the text of the current page.
 * @slot separator - Replaces the chevron shown before this item.
 *
 * @csspart separator - The separator preceding the item.
 *
 * @cssproperty --breadcrumbs-control-padding-inline - Inline padding of a control slotted into a crumb, matching the steps either side of it.
 * @cssproperty --breadcrumbs-control-size - How tall a control slotted into a crumb is.
 * @cssproperty --breadcrumbs-current-color - Text color of the current page's crumb.
 * @cssproperty --breadcrumbs-font-weight - Weight of every crumb's text.
 * @cssproperty --breadcrumbs-hover-color - Fill behind a step under the pointer.
 * @cssproperty --breadcrumbs-link-color - Text color of a crumb that is not the current page. A link
 *   you slot inherits it unless your own styles set a color.
 * @cssproperty --breadcrumbs-radius - Corner radius of the fill behind a step under the pointer.
 * @cssproperty --breadcrumbs-separator-color - Color of the chevron.
 */
@customElement('helix-breadcrumb')
export class HelixBreadcrumb extends HelixHeadlessBreadcrumb {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-breadcrumb': HelixBreadcrumb
  }
}
