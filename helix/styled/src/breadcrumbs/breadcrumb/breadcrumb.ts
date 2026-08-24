import { customElement } from '@helix-io/core'
import { HelixHeadlessBreadcrumb } from '@helix-io/headless/breadcrumbs'
import type { CSSResultGroup } from 'lit'
import { styles } from './breadcrumb.css.js'

/**
 * @summary One step in a breadcrumb trail.
 *
 * @description
 * The separator is hidden on the first item with `:host(:first-child)`, so no
 * item needs to know its own index and the parent needs no coordination.
 *
 * The link carries `data-link="quiet"`, the recipe navigation uses everywhere
 * else, which is what owns its color. Under the pointer it reads as a subtle
 * button. That part is styled from in here: the base layer sets color and
 * text-decoration on an anchor and nothing else, so the outer tree wins those
 * and leaves box and background to `::slotted`.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Crumb
 * @documentation https://helix.fusion.dev/components/breadcrumbs
 *
 * @slot - The step: a link, or the text of the current page.
 * @slot separator - Replaces the chevron shown before this item.
 *
 * @csspart separator - The separator preceding the item.
 *
 * @cssproperty --breadcrumbs-separator-color - Color of the chevron.
 * @cssproperty --breadcrumbs-hover-color - Fill behind a step under the pointer.
 * @cssproperty --breadcrumbs-control-size - How tall a control slotted into a crumb is.
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
