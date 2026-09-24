import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCanvasNode } from '@fusion.dev/helix-headless/canvas'
import type { CSSResultGroup } from 'lit'
import { styles } from './canvas-node.css.js'

/**
 * @summary One card, group or link on a canvas.
 *
 * @description
 * The card is the host, because the board places the host: its coordinates are
 * written onto this element, so a wrapper inside would have to be told the same
 * things twice.
 *
 * **Before it is placed it is a card in the flow**, which is what a page
 * without JavaScript has: the text somebody wrote, in the order they wrote it,
 * rather than a heap at the origin.
 *
 * @since 0.100.0
 * @status experimental
 * @category media
 * @aliases CanvasCard, BoardNode
 * @documentation https://fusion.dev/helix/components/canvas
 *
 * @cssproperty --canvas-node-background-color - The ground the card is drawn on.
 * @cssproperty --canvas-node-padding - Space between the card's edge and what it holds.
 */
@customElement('helix-canvas-node')
export class HelixCanvasNode extends HelixHeadlessCanvasNode {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-canvas-node': HelixCanvasNode
  }
}
