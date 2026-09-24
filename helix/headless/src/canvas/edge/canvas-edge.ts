import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import type { CanvasEnd, CanvasSide } from '../root/canvas-document.js'

/**
 * @summary A connector between two cards on a canvas.
 *
 * @description
 * **A declaration rather than a drawing**, which is the shape `Table.Column`
 * has: this element renders nothing at all and the board draws the line,
 * because a connector is geometry between two other elements and neither end of
 * it belongs here. What this carries is which cards, which sides, and what sits
 * at the ends.
 *
 * Written as markup for the reason its cards are: an array of edges handed to a
 * custom element does not survive React's hydration, and a connector a consumer
 * can write is one they can also put a condition around.
 *
 * @since 0.100.0
 * @status experimental
 * @category media
 * @aliases CanvasConnector, BoardEdge
 * @documentation https://fusion.dev/helix/components/canvas
 */
@customElement('helix-headless-canvas-edge')
export class HelixHeadlessCanvasEdge extends HelixElement {
  /** A color, as one of the six presets or as a value of its own. */
  @property()
  color?: string

  /** The card it leaves. */
  @property()
  from = ''

  /**
   * What sits at the end it leaves from.
   *
   * Absent is nothing, which is the format's own default and what makes an
   * ordinary connector a one-way arrow.
   */
  @property({ attribute: 'from-end' })
  fromEnd?: CanvasEnd

  /** Which side of that card it leaves, where the document says. */
  @property({ attribute: 'from-side' })
  fromSide?: CanvasSide

  /** What the connector says, drawn at its middle. */
  @property()
  label?: string

  /** The card it arrives at. */
  @property()
  to = ''

  /** What sits at the end it arrives at. Absent is an arrow, as the format says. */
  @property({ attribute: 'to-end' })
  toEnd?: CanvasEnd

  /** Which side of that card it arrives at, where the document says. */
  @property({ attribute: 'to-side' })
  toSide?: CanvasSide

  /**
   * Nothing, and deliberately so.
   *
   * The board draws every connector into one layer under the cards, which is
   * the only place a line between two of them can be drawn. This element exists
   * to be read.
   */
  protected override render(): TemplateResult {
    return html``
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-canvas-edge': HelixHeadlessCanvasEdge
  }
}
