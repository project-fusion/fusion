import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessNavigation } from '@fusion.dev/helix-headless/navigation'
import type { CSSResultGroup } from 'lit'
import { styles } from './navigation-root.css.js'

/**
 * @summary A set of destinations, with a marker on the current one.
 *
 * @description
 * One marker moves to the current destination. A moving marker is easier to
 * follow than a background that switches from one item to another, and the
 * movement shows which page you came from as well as which one is current.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Nav, NavList, Tabs
 * @documentation https://fusion.dev/helix/components/navigation
 *
 * @cssproperty --navigation-block-size - Height of the bar in a row. Each destination fills it.
 * @cssproperty --navigation-gap - Space between destinations.
 * @cssproperty --navigation-indicator-color - Fill of the marker on the current destination.
 * @cssproperty --navigation-indicator-radius - Corner radius of the marker.
 * @cssproperty --navigation-indicator-shadow - Shadow under the marker, for a marker that sits
 *   raised on the bar.
 * @cssproperty --navigation-item-color - Text color of a destination that is not the current one. Read by the page's stylesheet, which styles the links you slot.
 * @cssproperty --navigation-item-current-color - Text color of the current destination, the one marked `aria-current="page"`.
 * @cssproperty --navigation-item-current-font-weight - Weight of the current destination's text.
 * @cssproperty --navigation-item-font-size - Size of a destination's text.
 * @cssproperty --navigation-item-font-weight - Weight of a destination's text.
 * @cssproperty --navigation-item-hover-background-color - Background of a destination under the pointer.
 * @cssproperty --navigation-item-hover-color - Text color of a destination under the pointer.
 * @cssproperty --navigation-item-padding-inline - Space either side of a destination's text.
 * @cssproperty --navigation-item-radius - Corner radius of a destination, which its hover background follows.
 */
@customElement('helix-navigation')
export class HelixNavigation extends HelixHeadlessNavigation {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-navigation': HelixNavigation
  }
}
