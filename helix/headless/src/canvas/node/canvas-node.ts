import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * What the board draws from a card, as distinct from what it writes onto one:
 * `current` and `links` are the board's own, and listing them here would have
 * every card the board touched ask it to draw again.
 */
const DRAWN = ['color', 'height', 'label', 'type', 'url', 'width', 'x', 'y'] as const

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
 * **The card is the way around the board, for a reader who cannot see it.** The
 * board keeps one tab stop among its cards, arrow keys walk them in reading
 * order, and the one a reader lands on is brought into view. What it connects
 * to is read out with it, so the arrows between cards are heard as well as
 * seen. That replaced a list of every card under the board, which said the same
 * thing twice to a sighted reader and took a row from the board to do it.
 *
 * @since 0.100.0
 * @status experimental
 * @category media
 * @aliases CanvasCard, BoardNode
 * @documentation https://fusion.dev/helix/components/canvas
 *
 * @slot - What the card holds, which is anything: text, a picture, a chart.
 * @slot description - A quieter line under it.
 *
 * @csspart handle - A point on a side a connection is drawn from, on every one of the four.
 * @csspart handle-bottom - The point on the bottom side.
 * @csspart handle-left - The point on the left side.
 * @csspart handle-right - The point on the right side.
 * @csspart handle-top - The point on the top side.
 * @csspart node - The box the content sits in.
 *
 * @cssstate current - While this is the card a reader lands on when they tab into the board.
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
   * Whether the board lets a reader draw a connection from this card.
   *
   * Written by the board, which knows whether it is read-only: a handle a card
   * drew for itself would promise a gesture the board was about to refuse.
   */
  @property({ attribute: false })
  connectable = false

  /**
   * Whether this card holds the board's one tab stop.
   *
   * Written by the board, so it is a custom state rather than a reflected
   * attribute: the parent's bookkeeping does not belong in a consumer's markup.
   * One card at a time, so a board of forty cards is one press of Tab to get
   * past rather than forty.
   */
  @property({ attribute: false })
  current = false

  /** How tall the card is, in the document's own units. */
  @property({ type: Number })
  height = 0

  /**
   * What the card is called, for a group and wherever another card names it.
   *
   * A group needs one because it has no text of its own; a card that has text
   * is named by it, and one holding a picture or a figure is named by nothing
   * short enough to read out in another card's connections.
   */
  @property()
  label = ''

  /**
   * What the card connects to, as a sentence, which the board writes.
   *
   * Read out after the card's own content rather than as its name, so a reader
   * hears what the card says first and where it leads second.
   */
  @property({ attribute: false })
  links = ''

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

  /**
   * Tells the board when anything it draws from has changed.
   *
   * **This is what makes a controlled board work.** A consumer holding the
   * positions refuses `helix-before-move` and writes `x` and `y` themselves, and
   * React writes them as properties: neither reaches the board, which drew the
   * connectors from the old ones and left them pointing at where the card was.
   * The board is the parent by construction, so asking it to update is one call
   * and it batches whatever else changed in the same turn.
   */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (DRAWN.some((name) => changed.has(name))) {
      const board = this.parentElement as (HTMLElement & { requestUpdate?: () => void }) | null
      board?.requestUpdate?.()
    }
  }

  /**
   * Focuses the card rather than the host, which draws no box of its own.
   *
   * The board calls this to walk the cards, and a consumer can too: the part is
   * what holds the tab stop and what a focus ring is drawn around.
   */
  override focus(options?: FocusOptions): void {
    this.partNamed('node')?.focus(options)
  }

  /**
   * The card, and the sentence that says where it leads.
   *
   * **`aria-describedby` at a hidden element, which is allowed and is the
   * point.** A description is computed from its target whether or not the
   * target is rendered, so the connections are read out and never drawn: the
   * arrows already draw them.
   */
  protected override render(): TemplateResult {
    return html`<div
      part="node"
      aria-describedby=${this.links ? 'links' : nothing}
      aria-label=${this.type === 'group' ? this.label || nothing : nothing}
      aria-keyshortcuts=${this.connectable ? 'Shift+ArrowRight Shift+ArrowDown C Delete' : nothing}
      role=${this.type === 'group' ? 'group' : 'article'}
      tabindex=${this.current ? '0' : '-1'}
    >
      <slot></slot>
      <slot name="description"></slot>
      ${this.type === 'link' && this.url ? html`<a href=${this.url}>${this.url}</a>` : nothing}
      <span id="links" hidden>${this.links}</span>
    </div>
    ${
      /* **Written out, four times, because a part name behind an interpolation
         is one the manifest cannot see.** Hidden from assistive technology: a
         pointer draws from a handle and a keyboard presses C on the card, so
         the handle is the pointer's half of one action rather than a control
         of its own. */
      this.connectable
        ? html`<span part="handle handle-top" aria-hidden="true" data-side="top"></span>
            <span part="handle handle-right" aria-hidden="true" data-side="right"></span>
            <span part="handle handle-bottom" aria-hidden="true" data-side="bottom"></span>
            <span part="handle handle-left" aria-hidden="true" data-side="left"></span>`
        : nothing
    }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-canvas-node': HelixHeadlessCanvasNode
  }
}
