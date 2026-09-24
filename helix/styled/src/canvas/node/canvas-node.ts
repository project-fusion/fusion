import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCanvasNode } from '@fusion.dev/helix-headless/canvas'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './canvas-node.css.js'

/**
 * @summary One card or group on a canvas.
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
 * @cssproperty --canvas-handle-size - How large the points a connection is drawn from are.
 * @cssproperty --canvas-node-background-color - The ground the card is drawn on.
 * @cssproperty --canvas-node-color - A color with no meaning, where a tone will not do: a hex a document chose.
 * @cssproperty --canvas-node-padding - Space between the card's edge and what it holds.
 * @cssproperty --canvas-node-shadow - The lift under the card, which `separation="elevated"` sets.
 */
@customElement('helix-canvas-node')
export class HelixCanvasNode extends HelixHeadlessCanvasNode {
  /**
   * What the card's ground is made of: `glass` or `frosted`, which let the
   * board's ruling show through, or `transparent`.
   *
   * Absent is an opaque surface, a resting value being an attribute's absence.
   */
  @property({ reflect: true })
  material?: 'frosted' | 'glass' | 'transparent'

  /**
   * How the card stands off the board.
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
