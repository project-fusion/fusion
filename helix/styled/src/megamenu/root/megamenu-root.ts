import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMegamenu } from '@fusion.dev/helix-headless/megamenu'
import type { CSSResultGroup } from 'lit'
import { styles } from './megamenu-root.css.js'

/**
 * @summary A section of a navigation with a trigger that opens a panel of links.
 *
 * @description
 * Styles the trigger and lays out the panel it opens as a grid of columns. What
 * opens and closes the panel comes from the base class.
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
 * @cssproperty --megamenu-duration - How long the panel takes to open and close.
 * @cssproperty --megamenu-full-size - The maximum width of the band's contents, which are centered in it.
 * @cssproperty --megamenu-gap - The space between the panel's columns.
 * @cssproperty --megamenu-padding - The space inside the card's edge.
 * @cssproperty --megamenu-shadow - The shadow under the panel. Follows `--helix-shadow-floating`,
 *   so the panel has a shadow by default, because it sits over content you cannot predict.
 * @cssproperty --megamenu-size - The maximum width of the panel.
 * @cssproperty --megamenu-trigger-color - The trigger's text color at rest.
 * @cssproperty --megamenu-trigger-font-size - The size of the trigger's text.
 * @cssproperty --megamenu-trigger-font-weight - The weight of the trigger's text.
 * @cssproperty --megamenu-trigger-hover-color - The trigger's text color under the pointer.
 * @cssproperty --megamenu-trigger-open-background-color - The trigger's fill while its panel is open.
 * @cssproperty --megamenu-trigger-open-color - The trigger's text color while its panel is open.
 * @cssproperty --megamenu-trigger-padding-inline - The space either side of the trigger's text.
 * @cssproperty --megamenu-trigger-radius - The trigger's corners.
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
