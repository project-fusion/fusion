import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMenuItem } from '@fusion.dev/helix-headless/menu'
import type { CSSResultGroup } from 'lit'
import { styles } from './menu-item.css.js'

/**
 * @summary One row in a menu: a command, a choice, or a way into a submenu.
 *
 * @description
 * The tick and the arrow hold their space whether or not they are showing, so
 * the labels in a menu start at one place and the rows read as a column rather
 * than as a ragged list.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Menu option, Menu row
 * @documentation https://helix.fusion.dev/components/menu
 *
 * @cssproperty --menu-item-hover-color - Fill under the pointer.
 * @cssproperty --menu-item-start - Width of the leading column, for a row carrying more than a mark.
 */
@customElement('helix-menu-item')
export class HelixMenuItem extends HelixHeadlessMenuItem {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-menu-item': HelixMenuItem
  }
}
