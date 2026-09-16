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
 * @status experimental
 * @aliases Menu option, Menu row
 * @documentation https://fusion.dev/helix/components/menu
 *
 * @cssproperty --menu-item-end - Width of the trailing column, seam included, which holds a tick or the caret into a page.
 * @cssproperty --menu-item-hover-color - Fill under the pointer.
 * @cssproperty --menu-item-start - Width of the leading column, seam included, for a row carrying more than a mark. The menu sets it per page and zero is no column at all.
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
