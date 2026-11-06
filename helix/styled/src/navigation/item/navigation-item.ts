import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessNavigationItem } from '@fusion.dev/helix-headless/navigation'
import type { CSSResultGroup } from 'lit'
import { styles } from './navigation-item.generated.css.js'

/**
 * @summary One destination of a navigation, a link that can be marked current.
 *
 * @description
 * Drawn as the `data-navigation-item` recipe draws a link of your own, with
 * the same hooks, so an item and a link of your own stand alike in one bar.
 * The navigation's marker sits behind it, and its words go to full strength
 * while it is the current page.
 *
 * @since 0.224.0
 * @status experimental
 * @category navigation
 * @aliases NavItem, NavLink
 * @documentation https://fusion.dev/helix/components/navigation
 *
 * @cssproperty --navigation-item-color - Text color of a destination that is not the current one.
 * @cssproperty --navigation-item-current-color - Text color of the current destination, the one marked `current="page"`.
 * @cssproperty --navigation-item-current-font-weight - Weight of the current destination's text.
 * @cssproperty --navigation-item-font-size - Size of a destination's text.
 * @cssproperty --navigation-item-font-weight - Weight of a destination's text.
 * @cssproperty --navigation-item-hover-background-color - Background of a destination under the pointer.
 * @cssproperty --navigation-item-hover-color - Text color of a destination under the pointer.
 * @cssproperty --navigation-item-padding-inline - Space either side of a destination's text.
 * @cssproperty --navigation-item-radius - Corner radius of a destination, which its hover background follows.
 */
@customElement('helix-navigation-item')
export class HelixNavigationItem extends HelixHeadlessNavigationItem {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-navigation-item': HelixNavigationItem
  }
}
