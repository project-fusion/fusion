/*
 * Moving the items of a virtual list: `@fusion.dev/helix/virtual-list/reorder`.
 *
 * Its own entry, so a list that never moves items carries none of it.
 * Importing it gives every virtual list what `reorderable` turns on, and a
 * list that reorders the sheet that draws a move, with the hooks
 * `--virtual-list-dragging-opacity`, `--virtual-list-drop-indicator-color`,
 * `--virtual-list-drop-indicator-size`, and the `--virtual-list-drag-preview-*`
 * hooks set on the list.
 */
import { reorderVirtualList } from '@fusion.dev/helix-headless/virtual-list/reorder'
import { HelixVirtualList } from '../root/virtual-list-root.js'
import { styles } from './virtual-list-reorder.css.js'

reorderVirtualList(HelixVirtualList, styles)

export {
  reorderVirtualList,
  VirtualListReorderController,
} from '@fusion.dev/helix-headless/virtual-list/reorder'
