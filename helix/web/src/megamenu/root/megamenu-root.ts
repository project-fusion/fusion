import { customElement } from '@helix-io/core'
import { HelixBaseMegamenu } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './megamenu-root.css.js'

/**
 * @summary A section of a navigation that opens a panel of destinations.
 *
 * @description
 * Presentation only: the trigger, and the panel it opens as a grid of columns.
 * Everything about what opens it and what closes it is the base class.
 *
 * @since 0.1.0
 * @status experimental
 * @category navigation
 * @aliases Mega menu, Flyout, Nav panel
 * @documentation https://helix.fusion.dev/components/megamenu
 *
 * @cssproperty --megamenu-size - How wide the panel may get.
 * @cssproperty --megamenu-column-size - The narrowest a column goes before the grid wraps.
 */
@customElement('helix-megamenu')
export class HelixMegamenu extends HelixBaseMegamenu {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-megamenu': HelixMegamenu
  }
}
