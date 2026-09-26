import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMenu } from '@fusion.dev/helix-headless/menu'
import type { CSSResultGroup } from 'lit'
import { styles as collectionStateStyles } from '../../shared/collection/state.css.js'
import { styles as floatingEntranceStyles } from '../../shared/floating/entrance.css.js'
import { styles as floatingPanelStyles } from '../../shared/floating/panel.css.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './menu-root.css.js'

/**
 * @summary A menu of commands that opens from a trigger.
 *
 * @description
 * The surface is in the top layer, so it needs no `z-index` and cannot be
 * clipped by whatever it sits inside.
 *
 * A submenu replaces the page rather than opening beside it, so the panel stays
 * one panel and reads the same on a phone as on a desk.
 *
 * @since 0.1.0
 * @status stable
 * @category overlays
 * @aliases Dropdown, Action menu
 * @documentation https://fusion.dev/helix/components/menu
 *
 * @cssproperty --menu-background-color - Fill of the surface.
 * @cssproperty --menu-border-color - Color of the panel's edge.
 * @cssproperty --menu-border-width - Width of the panel's edge. Defaults to `--helix-border-floating`, which is `0`, so the panel stands out by its shadow unless a theme sets a border.
 *   `--helix-border-floating`, which is `0`, so the panel is told apart by its lift unless a
 *   theme says otherwise.
 * @cssproperty --menu-max-block-size - The tallest the menu grows before it scrolls.
 * @cssproperty --menu-min-inline-size - The narrowest the menu gets.
 * @cssproperty --menu-shadow - Shadow under the panel. Defaults to `--helix-shadow-floating`, so the panel keeps a shadow over any content below it.
 *   floating surface sits over content nobody can predict, so it keeps a lift by default.
 */
@customElement('helix-menu')
export class HelixMenu extends HelixHeadlessMenu {
  static override styles: CSSResultGroup = [
    liveStyles,
    collectionStateStyles,
    floatingPanelStyles,
    floatingEntranceStyles,
    styles,
  ]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-menu': HelixMenu
  }
}
