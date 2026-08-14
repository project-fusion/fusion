import { customElement } from '@helix-io/core'
import { HelixBaseBreadcrumb } from '@helix-io/headless'
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
 * else. It cannot be styled from in here: a slotted anchor belongs to the outer
 * tree, where `:where(a)` in the base layer outranks any `::slotted` rule.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Crumb
 * @documentation https://helix.fusion.dev/components/breadcrumbs
 *
 * @slot - The step: a link, or the text of the current page.
 * @slot separator - Replaces the separator shown before this item.
 *
 * @csspart separator - The separator preceding the item.
 *
 * @cssproperty --breadcrumbs-separator-color - Color of the separator.
 */
@customElement('helix-breadcrumb')
export class HelixBreadcrumb extends HelixBaseBreadcrumb {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-breadcrumb': HelixBreadcrumb
  }
}
