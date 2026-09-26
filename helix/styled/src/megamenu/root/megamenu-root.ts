import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMegamenu } from '@fusion.dev/helix-headless/megamenu'
import type { CSSResultGroup } from 'lit'
import { styles } from './megamenu-root.css.js'

/**
 * @summary A section of a navigation with a trigger that opens a panel of links.
 *
 * @description
 * Presentation only: the trigger, and the panel it opens as a grid of columns.
 * Everything about what opens it and what closes it is the base class.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Mega menu, Flyout, Nav panel
 * @documentation https://fusion.dev/helix/components/megamenu
 *
 * @cssproperty --megamenu-backdrop - The filter behind the panel, `none` by default. This family
 *   has no `material` property, so this and `--megamenu-background-color` set the panel's material.
 * @cssproperty --megamenu-background-color - The panel's fill.
 * @cssproperty --megamenu-border-width - The width of the panel's edge. Follows
 *   `--helix-border-floating`, which is `0` unless a theme changes it, so the panel stands out
 *   by its shadow.
 * @cssproperty --megamenu-column-size - The minimum width of a column before the grid wraps.
 * @cssproperty --megamenu-full-size - The maximum width of the band's contents, which are centered in it.
 * @cssproperty --megamenu-shadow - The shadow under the panel. Follows `--helix-shadow-floating`,
 *   so the panel has a shadow by default, because it sits over content you cannot predict.
 * @cssproperty --megamenu-size - The maximum width of the panel.
 */
@customElement('helix-megamenu')
export class HelixMegamenu extends HelixHeadlessMegamenu {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-megamenu': HelixMegamenu
  }
}
