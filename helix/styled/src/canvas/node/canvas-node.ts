import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCanvasNode } from '@fusion.dev/helix-headless/canvas'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './canvas-node.css.js'

/**
 * @summary One card or group on a canvas.
 *
 * @description
 * The card is the host element, because the board writes the card's coordinates
 * onto the host.
 *
 * Before the board places it, the card sits in normal flow. Without JavaScript,
 * the page shows the cards' text in the order it was written.
 *
 * @since 0.100.0
 * @status experimental
 * @category media
 * @aliases CanvasCard, BoardNode
 * @documentation https://fusion.dev/helix/components/canvas
 *
 * @cssproperty --canvas-grip-size - The size of the corner handles that resize a selected card.
 * @cssproperty --canvas-handle-size - The size of the points you draw a connection from.
 * @cssproperty --canvas-move-block-size - The height of the handle that moves a selected card.
 * @cssproperty --canvas-move-inline-size - The width of the handle that moves a selected card.
 * @cssproperty --canvas-move-inset - The distance between the move handle and the card's corner.
 * @cssproperty --canvas-node-background-color - The card's background.
 * @cssproperty --canvas-node-color - A color for the card that carries no meaning, such as a hex color from a document. Use it when no tone fits.
 * @cssproperty --canvas-node-padding - The space between the card's edge and its content.
 * @cssproperty --canvas-node-shadow - The shadow under the card, set by `separation="elevated"`.
 */
@customElement('helix-canvas-node')
export class HelixCanvasNode extends HelixHeadlessCanvasNode {
  /**
   * The material of the card's background: `glass` or `frosted`, which let the
   * board's grid lines show through, or `transparent`.
   *
   * Absent is an opaque surface, a resting value being an attribute's absence.
   */
  @property({ reflect: true })
  material?: 'frosted' | 'glass' | 'transparent'

  /**
   * How the card is set apart from the board: `outlined`, `filled`,
   * `elevated`, or `plain`.
   *
   * Outlined is where it rests, a surface with its color as the edge. `filled`
   * puts the color into the ground, `elevated` lifts it and keeps the edge, and
   * `plain` draws no box, for a label sitting on the board.
   */
  @property({ reflect: true })
  separation?: 'elevated' | 'filled' | 'outlined' | 'plain'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-canvas-node': HelixCanvasNode
  }
}
