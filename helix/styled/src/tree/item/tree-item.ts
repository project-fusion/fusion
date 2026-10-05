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
 * @slot chevron - Replaces the expand and collapse mark of a branch. A slotted icon is sized and
 *   turned like the drawn one.
 * @slot children - Nested items, which make this a branch.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the item is chosen, and cancelable. Canceling it changes nothing.
 *
 * @csspart checkbox - The check mark's box, in a tree with `selection-mode="multiple"`.
 * @csspart checkbox-checked - The check mark's box while the item is checked.
 * @csspart checkbox-mixed - The check mark's box while some of a branch's items are checked.
 * @csspart group - The container for nested items.
 * @csspart item - The node, and the focus target.
 * @csspart label - The label text.
 * @csspart row - The clickable label row.
 * @csspart toggle - The expand and collapse control.
 *
 * @cssproperty --tree-checkbox-background-color - Fill of the check mark's box.
 * @cssproperty --tree-checkbox-border-color - Border of the check mark's box.
 * @cssproperty --tree-checkbox-mark-color - Color of the check, and of the bar of a partly checked
 *   branch.
 * @cssproperty --tree-checkbox-size - Size of the check mark's box. Follows the chevron's size.
 * @cssproperty --tree-chevron-size - Size of the chevron, and the gutter a leaf reserves.
 * @cssproperty --tree-gap - Space between rows.
 * @cssproperty --tree-indent - Indent added per level.
 * @cssproperty --tree-row-checked-background-color - Fill of a checked row, in a tree with `selection-mode="multiple"`. Unset, the box alone marks it.
 * @cssproperty --tree-row-checked-color - Text color of a checked row, in a tree with `selection-mode="multiple"`.
 * @cssproperty --tree-row-color - Text color of a row at rest.
 * @cssproperty --tree-row-disabled-opacity - How faint a disabled row is drawn.
 * @cssproperty --tree-row-hover-background-color - Fill of a row under the pointer.
 * @cssproperty --tree-row-hover-color - Text color of a row under the pointer.
 * @cssproperty --tree-row-radius - Corners of a row's fill.
 * @cssproperty --tree-row-selected-background-color - Fill of the chosen row, in a tree of one choice.
 * @cssproperty --tree-row-selected-color - Text color of the chosen row, in a tree of one choice.
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
