import { customElement } from '@helix-io/core'
import { HelixBaseMenu } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './menu-root.css.js'

/**
 * @summary A menu of commands, opened from a trigger.
 *
 * @description
 * The surface is in the top layer, so it needs no `z-index` and cannot be
 * clipped by whatever it sits inside.
 *
 * A submenu replaces the page rather than opening beside it, so the panel stays
 * one panel and reads the same on a phone as on a desk.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Dropdown, Action menu
 * @documentation https://helix.fusion.dev/components/menu
 *
 * @cssproperty --menu-min-inline-size - Narrowest the surface gets.
 * @cssproperty --menu-background-color - Fill of the surface.
 */
@customElement('helix-menu')
export class HelixMenu extends HelixBaseMenu {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-menu': HelixMenu
  }
}
