import { customElement } from '@helix-io/core'
import { HelixBaseMegamenu } from '@helix-io/headless/megamenu'
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
 * @cssproperty --megamenu-backdrop - A filter behind the panel, for glass.
 * @cssproperty --megamenu-background - The panel's own fill.
 * @cssproperty --megamenu-border-width - Width of the panel's edge. Follows
 *   `--helix-border-floating`, which is `0`, so the panel is told apart by its lift unless a
 *   theme says otherwise.
 * @cssproperty --megamenu-column-size - The narrowest a column goes before the grid wraps.
 * @cssproperty --megamenu-full-size - How wide the band's contents may get, centered in it.
 * @cssproperty --megamenu-shadow - Lift under the panel. Follows `--helix-shadow-floating`: a
 *   floating surface sits over content nobody can predict, so it keeps a lift by default.
 * @cssproperty --megamenu-size - How wide the panel may get.
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
