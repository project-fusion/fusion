import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTreeItem } from '@fusion.dev/helix-headless/tree'
import type { CSSResultGroup } from 'lit'
import { styles } from './tree-item.css.js'

/**
 * @summary One node in a tree.
 *
 * @description
 * Indentation is a multiple of one hook, set from the `level` the tree assigns,
 * so an item moved to another depth re-indents with no nested selectors, at any
 * depth.
 *
 * The twisty rotates when a branch opens. The row itself stays flat.
 *
 * @since 0.1.0
 * @status stable
 * @aliases TreeNode, Branch, Leaf
 * @documentation https://fusion.dev/helix/components/tree
 *
 * @slot - The item's label.
 * @slot children - Nested items, which make this a branch.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the item is chosen, and cancelable. Canceling it changes nothing.
 *
 * @csspart group - The container for nested items.
 * @csspart item - The node, and the focus target.
 * @csspart label - The label text.
 * @csspart row - The clickable label row.
 * @csspart toggle - The expand and collapse control.
 *
 * @cssproperty --tree-chevron-size - Size of the chevron, and the gutter a leaf reserves.
 * @cssproperty --tree-gap - Space between rows.
 * @cssproperty --tree-indent - Indent added per level.
 * @cssproperty --tree-row-size - Minimum height of a row, so rows with and without an icon match.
 */
@customElement('helix-tree-item')
export class HelixTreeItem extends HelixHeadlessTreeItem {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tree-item': HelixTreeItem
  }
}
