import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
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
  fromSide?: CanvasSide | undefined

  /** What the connector says, drawn at its middle. */
  @property()
  label?: string | undefined

  /**
   * What a request calls this connection, unique on its board.
   *
   * Optional, unlike a card's: a connection is also known by its two ends,
   * which `helix-remove` carries beside this, so a page that names none of its
   * connections can still find the one a reader asked to take away.
   */
  @property()
  name = ''

  /**
   * How it travels: `straight`, or `step` for right angles.
   *
   * Absent is whatever the board says, and a curve where the board says
   * nothing. Not part of JSON Canvas, which draws every edge one way; a
   * document read from one keeps its curves.
   *
   * **`path` rather than `shape`**, which is a word this library already
   * spends on how an element looks in the styled tier: this changes the line
   * the connector is drawn along, which the board computes. Nor `route`, which
   * every element here already has, as the method that sends a child to a slot.
   */
  @property()
  path?: 'straight' | 'step'

  /**
   * Keeps this connection: a reader cannot remove it.
   *
   * The board's `readonly` still wins. A connection is still removed with a
   * card at either end of it, since a line to a card that has gone is not one
   * the board can draw.
   */
  @property({ attribute: 'readonly', reflect: true, type: Boolean })
  readOnly = false

  /** The card it arrives at. */
  @property()
  to = ''

  /** What sits at the end it arrives at. Absent is an arrow, as the format says. */
  @property({ attribute: 'to-end' })
  toEnd?: CanvasEnd

  /**
   * What the connection means, in the words every Helix component uses.
   *
   * A color with no meaning is `--canvas-edge-color`, written in the edge's own
   * `style`: the line is drawn by the board rather than by this element, so the
   * board carries the value across from where it was written.
   */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  /** Which side of that card it arrives at, where the document says. */
  @property({ attribute: 'to-side' })
  toSide?: CanvasSide | undefined

  /**
   * How the line is drawn: `dashed` or `dotted`, and solid where it says
   * neither.
   *
   * **A variant rather than an axis**, which is what the registry keeps it for:
   * no other family draws a line whose stroke says something, and a dashed
   * connection is the ordinary way to draw a weaker or an optional one. On the
   * headless tier because the board that draws the line is.
   */
  @property({ reflect: true })
  variant?: 'dashed' | 'dotted'

  /**
   * Tells the board the connector changed, since the board is what draws it.
   *
   * Every property here is one the line is drawn from, so any change is one
   * the board has to hear: a label written after the first paint otherwise
   * never appeared.
   */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const board = this.parentElement as (HTMLElement & { requestUpdate?: () => void }) | null
    board?.requestUpdate?.()
  }

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
