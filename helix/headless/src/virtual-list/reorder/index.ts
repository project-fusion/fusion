/*
 * Moving the items of a virtual list: `@fusion.dev/helix-headless/virtual-list/reorder`.
 *
 * Its own entry, so a list that never moves items carries none of it.
 * Importing it gives every virtual list of this tier what `reorderable` turns on.
 */
import { HelixHeadlessVirtualList } from '../root/virtual-list-root.js'
import { reorderVirtualList } from './virtual-list-reorder.js'

reorderVirtualList(HelixHeadlessVirtualList)

export { reorderVirtualList, VirtualListReorderController } from './virtual-list-reorder.js'
