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
 * @csspart loading - The row after the last item while `loading` is set.
 * @csspart viewport - The scrolling box.
 *
 * @cssproperty --virtual-list-block-size - How tall the scrolling box is.
 * @cssproperty --virtual-list-loading-color - The color of the text in the row drawn while `loading` is set.
 * @cssproperty --virtual-list-loading-padding - The space around the text in the row drawn while `loading` is set.
 * @cssproperty --virtual-list-selected-background-color - The fill behind a chosen row, in a list with `selection-mode`.
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
