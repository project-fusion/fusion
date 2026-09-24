import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCanvas } from '@fusion.dev/helix-headless/canvas'
import type { CSSResultGroup } from 'lit'
import { styles as viewportStyles } from '../../shared/viewport/viewport.css.js'
import { styles } from './canvas-root.css.js'

/**
 * @summary Draws a JSON Canvas document, read-only.
 *
 * @description
 * **The six color presets are the interesting part.** JSON Canvas writes a
 * color as `1` to `6` and leaves the values to the application, which is what
 * lets a board drawn in one be read in another. This sheet points them at
 * semantic tokens, so a board follows the page into dark mode rather than
 * carrying somebody else's hex into it.
 *
 * The plane is the one thing that moves: panning and zooming write three custom
 * properties and one transform reads them, so the cards are placed once in the
 * document's own coordinates and never laid out again.
 *
 * @since 0.100.0
 * @status stable
 * @category media
 * @aliases Board, JSON Canvas, Whiteboard
 * @documentation https://fusion.dev/helix/components/canvas
 *
 * @cssproperty --canvas-background-color - The well behind the board.
 * @cssproperty --canvas-block-size - How tall the frame is.
 * @cssproperty --canvas-border-color - Color of the frame's edge.
 * @cssproperty --canvas-color-1 - What the format's first color preset means here.
 * @cssproperty --canvas-color-2 - What the second preset means here.
 * @cssproperty --canvas-color-3 - What the third preset means here.
 * @cssproperty --canvas-color-4 - What the fourth preset means here.
 * @cssproperty --canvas-color-5 - What the fifth preset means here.
 * @cssproperty --canvas-color-6 - What the sixth preset means here.
 * @cssproperty --canvas-edge-color - Color of a connector that names no color of its own.
 * @cssproperty --canvas-index-block-size - How tall the reading list may grow before it scrolls.
 */
@customElement('helix-canvas')
export class HelixCanvas extends HelixHeadlessCanvas {
  /* The surface's sheet first, this family's after, so a board's own rules win
     where the two speak about the same box. */
  static override styles: CSSResultGroup = [viewportStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-canvas': HelixCanvas
  }
}
