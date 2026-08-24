import { customElement } from '@helix-io/core'
import { HelixHeadlessNavigation } from '@helix-io/headless/navigation'
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
 * @status experimental
 * @category navigation
 * @aliases Nav, NavList, Tabs
 * @documentation https://helix.fusion.dev/components/navigation
 *
 * @cssproperty --navigation-indicator-color - Fill of the traveling marker.
 * @cssproperty --navigation-gap - Space between destinations.
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
