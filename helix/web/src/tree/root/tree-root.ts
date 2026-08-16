import { customElement } from '@helix-io/core'
import { HelixBaseTree } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './tree-root.css.js'

/**
 * @summary A tree of items, navigable entirely from the keyboard.
 *
 * @description
 * Quiet by default: no rules between rows and no fill except on the selected
 * item. A navigation tree is read by scanning, and every line of chrome added
 * to it is one more thing between the reader and the label.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases FileTree, Navigation tree
 * @documentation https://helix.fusion.dev/components/tree
 *
 * @slot - The tree's items.
 *
 * @csspart tree - The tree container.
 *
 * @event {HelixSelectEvent} helix-select - Fired when an item is chosen. Dispatched by the item and listened for here, because the tree is what a consumer holds a reference to.
 *
 * @cssproperty --tree-indent - Indent added per level.
 * @cssproperty --tree-chevron-size - Size of the chevron, and the gutter a leaf reserves.
 */
@customElement('helix-tree')
export class HelixTree extends HelixBaseTree {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tree': HelixTree
  }
}
