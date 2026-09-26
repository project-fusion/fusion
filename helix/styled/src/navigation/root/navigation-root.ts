import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessNavigation } from '@fusion.dev/helix-headless/navigation'
import type { CSSResultGroup } from 'lit'
import { styles } from './navigation-root.css.js'

/**
 * @summary A set of destinations, with a marker on the current one.
 *
 * @description
 * One marker that travels, rather than a background that appears on whichever
 * destination is current. A fill that swaps is two things changing at once and
 * reads as a flicker; one that moves is a single object the eye follows, and it
 * says where the current page was as well as where it is.
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
