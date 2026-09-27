import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMenuItem } from '@fusion.dev/helix-headless/menu'
import type { CSSResultGroup } from 'lit'
import { styles } from './menu-item.css.js'

/**
 * @summary One row in a menu: a command, a choice, or a way into a submenu.
 *
 * @description
 * A row draws a leading or trailing column only when it has content for it. The
 * menu page sets the column width: once any row on a page fills a leading or
 * trailing slot, the page reserves that track for every row, so all labels on
 * the page start at the same edge. A page that fills neither reserves nothing.
 * The reservation is made on the page because each row's styles cover only its
 * own slots.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Menu option, Menu row
 * @documentation https://fusion.dev/helix/components/menu
 *
 * @cssproperty --menu-item-end - Width of the trailing column, including the gap before it, which holds a check mark or a submenu caret.
 * @cssproperty --menu-item-hover-color - Fill under the pointer.
 * @cssproperty --menu-item-start - Width of the leading column, including the gap after it, for a row with more than a mark. The menu sets it for each page, and `0` removes the column.
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
