import { customElement } from '@helix-io/core'
import { HelixBaseTreeItem } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { styles } from './tree-item.css.js'

/**
 * @summary One node in a tree.
 *
 * @description
 * Indent comes from the `level` the tree sets, as a multiple of one hook, so a
 * node moved to another depth re-indents without any nested selector. Nesting
 * selectors by depth is the usual approach and stops working at whatever depth
 * nobody wrote a rule for.
 *
 * The twisty rotates rather than swapping glyphs, so opening a branch is a
 * short movement instead of a substitution. Motion carries the state change;
 * the row itself stays flat.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases TreeNode, Branch, Leaf
 * @documentation https://helix.fusion.dev/components/tree
 *
 * @slot - The item's label.
 * @slot children - Nested items, which make this a branch.
 *
 * @csspart item - The node, and the focus target.
 * @csspart row - The clickable label row.
 * @csspart toggle - The expand and collapse control.
 * @csspart label - The label text.
 * @csspart group - The container for nested items.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the item is chosen.
 *
 * @cssproperty --tree-indent - Indent added per level.
 * @cssproperty --tree-chevron-size - Size of the chevron, and the gutter a leaf reserves.
 * @cssproperty --tree-gap - Space between rows.
 * @cssproperty --tree-row-size - Least height of a row, so rows with and without an icon match.
 */
@customElement('helix-tree-item')
export class HelixTreeItem extends HelixBaseTreeItem {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tree-item': HelixTreeItem
  }
}
