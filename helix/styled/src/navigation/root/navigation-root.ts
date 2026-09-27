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
 * @cssproperty --navigation-gap - Space between destinations.
 * @cssproperty --navigation-indicator-color - Fill of the marker on the current destination.
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
