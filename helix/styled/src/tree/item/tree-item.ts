import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessTreeItem } from '@fusion.dev/helix-headless/tree'
import type { CSSResultGroup } from 'lit'
import { styles } from './tree-item.css.js'
import '../../checkbox/index.js'

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
 * The row's actions are hidden until the row is hovered or focused, and hold
 * their room while hidden, so the label does not move under the pointer.
 *
 * @since 0.1.0
 * @status stable
 * @aliases TreeNode, Branch, Leaf
 * @documentation https://fusion.dev/design/components/tree
 *
 * @slot - The item's label. A nested item does not go here: give it `slot="children"`. In a development build, an item nested here is reported.
 * @slot chevron - Replaces the expand and collapse mark of a branch. A slotted icon is sized and
 *   turned like the drawn one.
 * @slot children - Nested items, which make this a branch.
 *
 * @event {HelixBeforeSelectEvent} helix-before-select - Fired when the item is chosen, and cancelable. Canceling it changes nothing.
 *
 * @csspart check - The inert `Checkbox` that draws the check mark, inside `checkbox`.
 * @csspart check-box - Forwarded from the checkbox: the box drawn for its input.
 * @csspart check-control - Forwarded from the checkbox: its native input, inert.
 * @csspart check-feedback - Forwarded from the checkbox. Not shown, since a check mark is never wrong.
 * @csspart check-field - Forwarded from the checkbox: the row that holds its box.
 * @csspart check-hint - Forwarded from the checkbox. Not shown, since a check mark has no help.
 * @csspart check-label - Forwarded from the checkbox. Not shown, since the item's own label names it.
 * @csspart check-mark - Forwarded from the checkbox: the tick, or the dash while some of a branch's items are checked.
 * @csspart check-mark-checked - Forwarded from the checkbox: added to `check-mark` while the item is checked.
 * @csspart check-mark-dash - Forwarded from the checkbox: added to `check-mark` while it is the dash.
 * @csspart check-mark-indeterminate - Forwarded from the checkbox: added to `check-mark` while some of a branch's items are checked.
 * @csspart checkbox - What holds the check mark, in a tree with `selection-mode="multiple"`. A press on it checks the item.
 * @csspart checkbox-checked - Added to `checkbox` while the item is checked.
 * @csspart checkbox-mixed - Added to `checkbox` while some of a branch's items are checked.
 * @csspart grip - The handle a pointer drags to move the item, in a `reorderable` tree.
 * @csspart grip-mark - The icon on the grip.
 * @csspart group - The container for nested items.
 * @csspart item - The node, and the focus target.
 * @csspart label - The label text.
 * @csspart row - The clickable label row.
 * @csspart toggle - The expand and collapse control.
 *
 * @cssproperty --tree-actions-color - Color of the row's actions, inherited by what is slotted into `actions`.
 * @cssproperty --tree-actions-size - Edge length of an icon button in the row's actions. Half again the chevron's size.
 * @cssproperty --tree-checkbox-background-color - Fill of the check mark's box.
 * @cssproperty --tree-checkbox-border-color - Border of the check mark's box.
 * @cssproperty --tree-checkbox-mark-color - Color of the check, and of the bar of a partly checked
 *   branch.
 * @cssproperty --tree-checkbox-size - Size of the check mark's box. Follows the checkbox size, as Checkbox does.
 * @cssproperty --tree-chevron-size - Size of the chevron, and the gutter a leaf reserves.
 * @cssproperty --tree-dragging-opacity - The opacity of an item being moved, in a `reorderable` tree.
 * @cssproperty --tree-drop-indicator-color - The color of the line where a moved item would land.
 * @cssproperty --tree-drop-indicator-size - The thickness of the line where a moved item would land.
 * @cssproperty --tree-gap - Space between rows.
 * @cssproperty --tree-grip-color - The color of the grip, in a `reorderable` tree.
 * @cssproperty --tree-indent - Indent added per level.
 * @cssproperty --tree-row-checked-background-color - Fill of a checked row, in a tree with `selection-mode="multiple"`. Unset, the box alone marks it.
 * @cssproperty --tree-row-checked-color - Text color of a checked row, in a tree with `selection-mode="multiple"`.
 * @cssproperty --tree-row-color - Text color of a row at rest. Muted, except for a leaf in a `nesting="heading"` tree, which takes the full foreground.
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
  /** Composes the styled `Checkbox` for its check mark. */
  static override tier = 'helix-'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tree-item': HelixTreeItem
  }
}
