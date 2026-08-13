import { customElement } from '@helix-io/core'
import { HelixBaseBreadcrumbsItem } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './breadcrumbs-item.css.js'

/**
 * @summary One step in a breadcrumb trail.
 *
 * @description
 * The separator is hidden on the first item with `:host(:first-child)`, so no
 * item needs to know its own index and the parent needs no coordination.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Crumb
 * @documentation https://helix.fusion.dev/components/breadcrumbs
 *
 * @slot - The item's label.
 * @slot separator - Replaces the separator shown before this item.
 *
 * @csspart separator - The separator preceding the item.
 * @csspart link - The item's link, or its text when current.
 *
 * @cssproperty --breadcrumbs-separator-color - Color of the separator.
 */
@customElement('helix-breadcrumbs-item')
export class HelixBreadcrumbsItem extends HelixBaseBreadcrumbsItem {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-breadcrumbs-item': HelixBreadcrumbsItem
  }
}
