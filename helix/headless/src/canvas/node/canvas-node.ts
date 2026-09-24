import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/**
 * What the board draws from a card, as distinct from what it writes onto one:
 * `current` and `links` are the board's own, and listing them here would have
 * every card the board touched ask it to draw again.
 */
const DRAWN = [
  'group',
  'height',
  'label',
  'name',
  'readOnly',
  'shape',
  'tone',
  'width',
  'x',
  'y',
] as const

/**
 * @summary One card or group on a canvas.
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
 * **Named by `name`, which only has to be unique on its board**, the way a
 * form control's is in its form. An `id` has to be unique on the whole page,
 * and two boards written from one template, or one board shown twice, would
 * each have a card called `write` with no way to say which one a connection
 * meant. `id` is left for the page, which can still use it.
 *
 * **What it holds is the consumer's**, which is why there is no card type any
 * more: a card of text is text, a link is a link they put inside it, a file is
 * whatever they show for one. The one kind the board treats differently is a
 * group, a box drawn behind the cards inside it, and `group` says so. JSON
 * Canvas's four types are mapped by `fromJsonCanvas` on the way in.
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
 * @csspart grip - A corner a selected card is resized from, on every one of the four.
 * @csspart grip-bottom-left - The bottom left corner.
 * @csspart grip-bottom-right - The bottom right corner.
 * @csspart grip-top-left - The top left corner.
 * @csspart grip-top-right - The top right corner.
 * @csspart handle - A point on a side a connection is drawn from, on every one of the four.
 * @csspart handle-bottom - The point on the bottom side.
 * @csspart handle-left - The point on the left side.
 * @csspart handle-right - The point on the right side.
 * @csspart handle-top - The point on the top side.
 * @csspart node - The box the content sits in.
 * @csspart outline - The drawn outline of a card whose shape a box cannot draw, a diamond.
 *
 * @cssstate candidate - While a connection is being drawn and this card is somewhere it could arrive.
 * @cssstate current - While this is the card a reader lands on when they tab into the board.
 * @cssstate selected - While this is the card the reader selected, until they select something else or nothing.
 * @cssstate target - While a connection being drawn would arrive here if it were let go.
 */
@customElement('helix-headless-canvas-node')
export class HelixHeadlessCanvasNode extends HelixElement {
  /**
   * A box drawn behind the cards inside it rather than a card.
   *
   * The board works out what is inside it from the geometry, which is what the
   * format does too, and moves them with it. Its `label` is drawn above it.
   */
  @property({ reflect: true, type: Boolean })
  group = false

  /**
   * @internal Whether a connection being drawn could arrive here, written by
   * the board. Not a consumer's to set: whether a card can take one is the
   * board's arithmetic over its own read-only switches and this card's.
   */
  @state()
  candidate = false

  /**
   * @internal Whether the board lets a reader move, connect or remove this
   * card, written by the board. Not a consumer's to set: `readonly` is theirs,
   * and this is what the board makes of it and of its own.
   */
  @state()
  connectable = false

  /**
   * @internal Whether this card holds the board's one tab stop, written by the
   * board. One card at a time, so a board of forty cards is one press of Tab to
   * get past rather than forty.
   */
  @state()
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
   * What connections and requests call this card, unique on its board.
   *
   * Required: a card with no name is drawn but nothing can connect to it, and
   * the board has nothing to say when a reader asks for it to go.
   */
  @property()
  name = ''

  /**
   * @internal What the card connects to, as a sentence, written by the board.
   * Read out after the card's own content rather than as its name, so a reader
   * hears what the card says first and where it leads second.
   */
  @state()
  links = ''

  /**
   * Keeps this card where it is: not moved, not connected, not removed.
   *
   * **The board's own word, meaning the same thing one card at a time.** A
   * board of cards a reader rearranges often has one that anchors it, a start
   * or a title, and this is that card. The board's `readonly` still wins, so a
   * read-only board is read-only whatever its cards say.
   */
  @property({ attribute: 'readonly', reflect: true, type: Boolean })
  readOnly = false

  /**
   * The card's outline: `circle`, `diamond`, `pill` or `square`, and a rounded
   * box where it says none.
   *
   * **A flowchart's vocabulary, and the reason it is on this tier**: a diamond
   * is drawn as an outline the card renders, because a border follows a box
   * and a diamond is not one, so the markup differs before any rule is
   * written. Every shape here meets the middle of each side of its box, which
   * is where a connection arrives, so a connection to a diamond lands on its
   * point and one to a circle on its curve without the board knowing which.
   */
  @property({ reflect: true })
  shape?: 'circle' | 'diamond' | 'pill' | 'square'

  /**
   * @internal Whether this is the card the reader selected, written by the
   * board. Kept apart from focus, so a reader who clicks a button beside the
   * board to act on the selection has not cleared it by clicking.
   */
  @state()
  selected = false

  /**
   * @internal Whether the board lets a reader resize this card now, written by
   * the board: the card is the one selected, and nothing holds it.
   */
  @state()
  resizable = false

  /**
   * What the card means, in the words every Helix component uses for it.
   *
   * **`tone` rather than the format's `color`**, which was a second word for
   * the same thing on this family alone: JSON Canvas writes `1` to `6` and
   * leaves the meaning to the application, and this board had already pinned
   * each to a tone. `fromJsonCanvas` maps the six to tones on the way in. A
   * color with no meaning, a hex a document chose, is a custom property on the
   * card, `--canvas-node-color`, which is a style rather than a statement.
   *
   * On the headless tier because meaning survives having no stylesheet.
   */
  @property({ reflect: true })
  tone?: 'accent' | 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  /**
   * @internal Whether a connection being drawn would arrive here if it were
   * let go, written by the board.
   */
  @state()
  target = false

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
    this.toggleState('candidate', this.candidate)
    this.toggleState('current', this.current)
    this.toggleState('selected', this.selected)
    this.toggleState('target', this.target)
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
    return html`${
      this.shape === 'diamond' && !this.group
        ? html`<svg part="outline" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100">
            <polygon points="50,0 100,50 50,100 0,50" vector-effect="non-scaling-stroke" />
          </svg>`
        : nothing
    }<div
      part="node"
      aria-describedby=${this.links ? 'links' : nothing}
      aria-label=${this.group ? this.label || nothing : nothing}
      aria-keyshortcuts=${this.connectable ? 'Enter F2 Space Shift+ArrowRight Shift+ArrowDown Alt+ArrowRight Alt+ArrowDown C Delete' : nothing}
      role=${this.group ? 'group' : 'article'}
      tabindex=${this.current ? '0' : '-1'}
    >
      <slot></slot>
      <slot name="description"></slot>
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
    }
    ${
      /* The corners, for a selected card, written out for the same reason. */
      this.resizable
        ? html`<span part="grip grip-top-left" aria-hidden="true" data-corner="top-left"></span>
            <span part="grip grip-top-right" aria-hidden="true" data-corner="top-right"></span>
            <span part="grip grip-bottom-right" aria-hidden="true" data-corner="bottom-right"></span>
            <span part="grip grip-bottom-left" aria-hidden="true" data-corner="bottom-left"></span>`
        : nothing
    }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-canvas-node': HelixHeadlessCanvasNode
  }
}
