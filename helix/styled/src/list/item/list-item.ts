import { customElement } from '@helix-io/core'
import { HelixHeadlessListItem } from '@helix-io/headless/list'
import type { CSSResultGroup } from 'lit'
import { styles } from './list-item.css.js'

/**
 * @summary One row of a list.
 *
 * @description
 * A grid rather than a flex row, so the supporting text lines up under the
 * label rather than under the leading icon. The leading and trailing regions
 * hold their own width and the middle takes the rest.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Row, Entry
 * @documentation https://helix.fusion.dev/components/list
 *
 * @cssproperty --list-item-inset - Padding inside the row.
 * @cssproperty --list-item-rail-content - What the rail cell shows. Written by the list.
 * @cssproperty --list-item-rail-display - Whether there is a rail at all. Written by the list.
 * @cssproperty --list-item-term-weight - Weight of a description list's term.
 */
@customElement('helix-list-item')
export class HelixListItem extends HelixHeadlessListItem {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-list-item': HelixListItem
  }
}
