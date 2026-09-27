import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessVirtualList } from '@fusion.dev/helix-headless/virtual-list'
import type { CSSResultGroup } from 'lit'

import { styles } from './virtual-list-root.css.js'

/**
 * @summary A list that renders only the rows of a long set that are on screen.
 *
 * @description
 * The styled tier styles only the scrolling box. Rows are your markup in the
 * light DOM, so your stylesheet styles them the same as any other content, and
 * this tier sets no rules for them.
 *
 * @category layout
 * @since 0.1.0
 * @status stable
 * @documentation https://fusion.dev/helix/components/virtual-list
 *
 * @csspart after - The space that stands in for the rows below the rendered ones.
 * @csspart before - The space that stands in for the rows above the rendered ones.
 * @csspart viewport - The scrolling box.
 *
 * @cssproperty --virtual-list-block-size - How tall the scrolling box is.
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
