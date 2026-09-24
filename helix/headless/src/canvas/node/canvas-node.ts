import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One card, group or link on a canvas.
 *
 * @description
 * **Markup rather than an entry in an array**, which is the rule
 * `VideoPlaylist` writes out: an array handed to a custom element is missing
 * from the first paint of every server-rendered React page, because React skips
 * the properties it would have to apply imperatively while hydrating. A card
 * written as an element is in the served HTML whichever renderer wrote it, and
 * what is inside it is the consumer's own DOM rather than a string this
 * component parses.
 *
 * **Where it sits is data**, which is what makes a canvas a canvas: somebody
 * placed this card and the placement carries meaning, so `x` and `y` are given
 * rather than computed. The board reads them and places the card; a page with
 * no JavaScript has the cards and their text and not the arrangement, which is
 * the honest half of what a board can promise before it hydrates.
 *
 * @since 0.100.0
 * @status stable
 * @category media
 * @aliases CanvasCard, BoardNode
 * @documentation https://fusion.dev/helix/components/canvas
 *
 * @slot - What the card holds, which is anything: text, a picture, a chart.
 * @slot description - A quieter line under it.
 *
 * @csspart node - The box the content sits in.
 *
 * @cssstate current - While the board has brought this card to the middle.
 */
@customElement('helix-headless-canvas-node')
export class HelixHeadlessCanvasNode extends HelixElement {
  /**
   * A color, as one of the format's six presets or as a value of its own.
   *
   * A preset is a number from `1` to `6` and means whatever the application
   * says, which is what lets a board drawn in one be read in another. Anything
   * else is taken as a color and set as one.
   */
  @property({ reflect: true })
  color?: string

  /**
   * Whether the board has just brought this card to the middle.
   *
   * Written by the board, so it is a custom state rather than a reflected
   * attribute: the parent's bookkeeping does not belong in a consumer's markup.
   */
  @property({ attribute: false })
  current = false

  /** How tall the card is, in the document's own units. */
  @property({ type: Number })
  height = 0

  /**
   * What the card is called, for a group and for the reading list.
   *
   * A group needs one because it has no text of its own; a card that has text
   * is named by it.
   */
  @property()
  label = ''

  /**
   * What kind of thing it is.
   *
   * A `group` is a box drawn behind the cards inside it rather than a card, and
   * the board works out what is inside it from the geometry.
   *
   * Absent is a card of text, a resting value being an attribute's absence: a
   * default that reflected would write `type="text"` onto every card a consumer
   * wrote without one, which their server never sent and React reports as a
   * mismatch it will not patch up.
   */
  @property({ reflect: true })
  type?: 'text' | 'file' | 'link' | 'group'

  /** Where it points, for a link. */
  @property()
  url?: string

  /** How wide the card is, in the document's own units. */
  @property({ type: Number })
  width = 0

  /** Where its left edge sits, in the document's own units. */
  @property({ type: Number })
  x = 0

  /** Where its top edge sits, in the document's own units. */
  @property({ type: Number })
  y = 0

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('current', this.current)
  }

  protected override render(): TemplateResult {
    return html`<div
      part="node"
      aria-label=${this.type === 'group' ? this.label || nothing : nothing}
      role=${this.type === 'group' ? 'group' : 'article'}
    >
      <slot></slot>
      <slot name="description"></slot>
      ${this.type === 'link' && this.url ? html`<a href=${this.url}>${this.url}</a>` : nothing}
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-canvas-node': HelixHeadlessCanvasNode
  }
}
