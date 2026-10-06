import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCanvas } from '@fusion.dev/helix-headless/canvas'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles as viewportStyles } from '../../shared/viewport/viewport.css.js'
import { styles } from './canvas-root.css.js'

/**
 * @summary A board of cards and the connections between them, which can be navigated, rearranged, and connected.
 *
 * @description
 * Cards and connections take `tone`, like every other family. The tones resolve
 * to semantic tokens, so a board follows the page into dark mode.
 * `fromJsonCanvas` maps the six JSON Canvas color presets to tones.
 *
 * Panning and zooming move only the plane. They write three custom properties
 * that one transform reads, so the cards are placed once in the document's
 * coordinates and are not laid out again.
 *
 * @since 0.100.0
 * @status experimental
 * @category media
 * @aliases Board, JSON Canvas, Whiteboard
 * @documentation https://fusion.dev/helix/components/canvas
 *
 * @cssproperty --canvas-background-color - The background behind the board.
 * @cssproperty --canvas-block-size - The height of the frame.
 * @cssproperty --canvas-border-color - The color of the frame's edge.
 * @cssproperty --canvas-connect-color - The color of a connection being drawn, and of the card it will arrive at and that card's points.
 * @cssproperty --canvas-edge-color - The color of a connection with no tone. Set it in one edge's `style` to color only that edge.
 * @cssproperty --canvas-edge-target-width - The width of the area a pointer can press on a connection, which is wider than the drawn line.
 * @cssproperty --canvas-edge-width - The width of a connection's line. A selected or focused connection is drawn at twice it.
 * @cssproperty --canvas-grid-size - The spacing of the grid lines or dots, in the document's units, so it scales with the zoom.
 * @cssproperty --canvas-handle-size - The size of the ends of a selected connection. A card's connection points use the same property.
 * @cssproperty --canvas-label-color - The color of the label on a connection.
 * @cssproperty --canvas-label-editor-inline-size - The width of the field for editing a label.
 * @cssproperty --canvas-label-font-size - The size of the label on a connection.
 * @cssproperty --canvas-radius - The frame's corners.
 * @cssproperty --canvas-selected-color - The color of what is selected: a card's outline, its corners and its move handle, a connection and its ends, and the box drawn to select.
 * @cssproperty --viewport-control-background-color - The background of the pan and zoom buttons. `Map` uses the same property.
 */
@customElement('helix-canvas')
export class HelixCanvas extends HelixHeadlessCanvas {
  /**
   * Draws `lines` or `dots` on the board's plane, so you can see it move.
   *
   * **Baked in rather than a family of its own**, which was the question worth
   * asking: a grid has no content, no position and nothing to slot, so an
   * element for it would be an element with no reason to exist. It is the
   * board's own surface, and what a consumer varies about it is a length.
   *
   * **On the plane and not on the well**, which is what makes it worth having:
   * the ruling is drawn in the document's own units, so it moves and scales with
   * the cards and a drag has something to move against. A grid on the frame
   * would sit still while the board slid over it, which reads as the board
   * standing still.
   *
   * Absent is no ruling, a resting value being an attribute's absence.
   */
  @property({ reflect: true })
  grid?: 'lines' | 'dots'

  /**
   * How the board is set apart from the page. `plain` draws no frame.
   *
   * Framed is where it rests. Plain is for a board that fills a panel or an
   * app's working area, where the container is already the frame.
   */
  @property({ reflect: true })
  separation?: 'outlined' | 'plain'
  /* The surface's sheet first, this family's after, so a board's own rules win
     where the two speak about the same box. */
  static override styles: CSSResultGroup = [liveStyles, viewportStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-canvas': HelixCanvas
  }
}
