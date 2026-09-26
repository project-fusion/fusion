import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessMenuItem } from '@fusion.dev/helix-headless/menu'
import type { CSSResultGroup } from 'lit'
import { styles } from './menu-item.css.js'

/**
 * @summary One row in a menu: a command, a choice, or a way into a submenu.
 *
 * @description
 * A row draws a column beside its label only where it has something to put in
 * one, and the width is the menu's rather than the row's: the page reserves a
 * leading or a trailing track as soon as any row on it fills one, so every
 * label on that page starts at the same edge and a page that fills neither pays
 * for neither. A row knows about its own slots and nothing about its
 * neighbors, which is why the reservation is not made here.
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
