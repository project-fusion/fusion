import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessVirtualList } from '@fusion.dev/helix-headless/virtual-list'
import type { CSSResultGroup } from 'lit'

import { styles } from './virtual-list-root.css.js'

/**
 * @summary A list that renders only the rows of a long set that are on screen.
 *
 * @description
 * The styled tier styles the scrolling box and draws the focus ring on the row
 * holding focus. Rows are your markup in the light DOM, so your stylesheet
 * styles them the same as any other content, and a rule of yours on a row wins
 * over the ring. While `loading` is set, a muted, centered row after the last
 * item says "Loading more". In a list with `selection-mode`, a chosen row takes
 * the fill a chosen List row takes.
 *
 * @category layout
 * @since 0.1.0
 * @status stable
 * @documentation https://fusion.dev/helix/components/virtual-list
 *
 * @csspart after - The space that stands in for the rows below the rendered ones.
 * @csspart before - The space that stands in for the rows above the rendered ones.
 * @csspart empty - The row shown when there are no items and none are loading, where `empty-text` or the `empty` slot gives it content.
 * @csspart loading - The row after the last item while `loading` is set.
 * @csspart viewport - The scrolling box.
 *
 * @cssproperty --virtual-list-block-size - How tall the scrolling box is. A list that runs across is as tall as its rows unless you set it.
 * @cssproperty --virtual-list-disabled-opacity - How faint a row `disabled-keys` names is drawn.
 * @cssproperty --virtual-list-drag-preview-background-color - The fill behind the copy of a row a pointer drags, in a `reorderable` list with `@fusion.dev/helix/virtual-list/reorder` imported.
 * @cssproperty --virtual-list-drag-preview-border-color - The color of the edge around the copy of a row a pointer drags.
 * @cssproperty --virtual-list-drag-preview-border-width - The width of the edge around the copy of a row a pointer drags. None by default, where the shadow lifts it.
 * @cssproperty --virtual-list-drag-preview-opacity - The opacity of the copy of a row a pointer drags.
 * @cssproperty --virtual-list-drag-preview-radius - The corner radius of the copy of a row a pointer drags.
 * @cssproperty --virtual-list-drag-preview-shadow - The shadow that raises the copy of a row a pointer drags over the page.
 * @cssproperty --virtual-list-dragging-opacity - The opacity of a row being dragged, in a `reorderable` list with `@fusion.dev/helix/virtual-list/reorder` imported.
 * @cssproperty --virtual-list-drop-indicator-color - The color of the line where a dragged row would land.
 * @cssproperty --virtual-list-drop-indicator-size - The thickness of the line where a dragged row would land.
 * @cssproperty --virtual-list-empty-color - The color of the text in the row shown when there are no items.
 * @cssproperty --virtual-list-empty-padding - The space around the text in the row shown when there are no items.
 * @cssproperty --virtual-list-loading-color - The color of the text in the row drawn while `loading` is set.
 * @cssproperty --virtual-list-loading-padding - The space around the text in the row drawn while `loading` is set.
 * @cssproperty --virtual-list-scrollbar-thumb-color - The thumb of the list's scrollbar. Defaults to `--helix-scrollbar-thumb-color`.
 * @cssproperty --virtual-list-scrollbar-thumb-hover-color - The thumb while the pointer is over the list. Defaults to `--helix-scrollbar-thumb-hover-color`.
 * @cssproperty --virtual-list-scrollbar-track-color - The track of the list's scrollbar. Defaults to `--helix-scrollbar-track-color`.
 * @cssproperty --virtual-list-selected-background-color - The fill behind a chosen row, in a list with `selection-mode`.
 * @cssproperty --virtual-list-selected-color - The color of the text in a chosen row, in a list with `selection-mode`. Inherited by default.
 */
@customElement('helix-virtual-list')
export class HelixVirtualList extends HelixHeadlessVirtualList {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-virtual-list': HelixVirtualList
  }
}
