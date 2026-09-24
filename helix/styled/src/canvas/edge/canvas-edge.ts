import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCanvasEdge } from '@fusion.dev/helix-headless/canvas'
import { type CSSResultGroup, css } from 'lit'

/**
 * @summary A connector between two cards on a canvas.
 *
 * @description
 * Draws nothing and takes no room: the board draws every connector into one
 * layer under the cards, which is the only place a line between two of them can
 * be drawn. What this element carries is which cards and which sides.
 *
 * @since 0.100.0
 * @status experimental
 * @category media
 * @aliases CanvasConnector, BoardEdge
 * @documentation https://fusion.dev/helix/components/canvas
 */
@customElement('helix-canvas-edge')
export class HelixCanvasEdge extends HelixHeadlessCanvasEdge {
  /* A declaration occupies no space, so it is `none` rather than `contents`:
     `contents` would leave it a box-less participant in the board's layout and
     this has nothing to contribute to one. */
  static override styles: CSSResultGroup = css`
    :host {
      display: none;
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-canvas-edge': HelixCanvasEdge
  }
}
