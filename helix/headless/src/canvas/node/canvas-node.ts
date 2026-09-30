import { customElement, HelixElement, PlacementController } from '@fusion.dev/helix-core'
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
 * A card is an element in the markup, the rule `VideoPlaylist` also follows. An
 * array passed to a custom element is missing from the first paint of every
 * server-rendered React page, because React skips the properties it would have
 * to set imperatively during hydration. A card element is in the served HTML
 * whichever renderer wrote it, and its contents are your own DOM.
 *
 * Set `x` and `y` to place the card. On a canvas the placement carries meaning,
 * so positions are given and never computed. The board reads them and places
 * the card. Without JavaScript, the page shows the cards and their text without
 * the arrangement.
 *
 * `name` identifies the card and only has to be unique on its board, like a
 * form control's name in its form. An `id` must be unique on the whole page,
 * which fails when two boards come from one template or one board is shown
 * twice. `id` stays free for your own use.
 *
 * The card holds your content, and there is no card type. Text is text, a link
 * is a link you put inside the card, and a file is whatever you show for one.
 * The board treats one kind differently: a group, drawn as a box behind the
 * cards inside it. Set `group` for a group. `fromJsonCanvas` maps the four JSON
 * Canvas node types on the way in.
 *
 * The cards are how you move around the board with a keyboard or a screen
 * reader. The board keeps one tab stop among its cards, the arrow keys move
 * through them in reading order, and the card you land on scrolls into view.
 * Its connections are announced with it, so a screen reader reads the arrows
 * between cards.
 *
 * @since 0.100.0
 * @status experimental
 * @category media
 * @aliases CanvasCard, BoardNode
 * @documentation https://fusion.dev/helix/components/canvas
 *
 * @slot - The card's content, such as text, a picture, or a chart.
 * @slot description - A line of secondary text under the content.
 *
 * @csspart grip - A corner handle that resizes a selected card, on each of the four corners.
 * @csspart grip-bottom-left - The bottom left corner.
 * @csspart grip-bottom-right - The bottom right corner.
 * @csspart grip-top-left - The top left corner.
 * @csspart grip-top-right - The top right corner.
 * @csspart handle - A point that you draw a connection from, on each of the four sides.
 * @csspart handle-bottom - The point on the bottom side.
 * @csspart handle-left - The point on the left side.
 * @csspart handle-right - The point on the right side.
 * @csspart handle-top - The point on the top side.
 * @csspart move - The handle that moves a selected card. Drag it, or click once to pick the card up and again to put it down.
 * @csspart node - The box the content sits in.
 * @csspart outline - The drawn outline of a `diamond` card, a shape a box cannot draw.
 *
 * @cssstate candidate - While a connection is being drawn and this card is somewhere it could arrive.
 * @cssstate current - The card that receives focus when you tab into the board.
 * @cssstate placed - Placed on the board.
 * @cssstate selected - The card is selected.
 * @cssstate target - A connection being drawn would end here if you released it.
 */
@customElement('helix-headless-canvas-node')
export class HelixHeadlessCanvasNode extends HelixElement {
  /**
   * Makes this a group: a box drawn behind the cards inside it.
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
   * The card's name as text. A group shows it, and another card's connections
   * read it out.
   *
   * A group needs one because it has no text of its own; a card that has text
   * is named by it, and one holding a picture or a figure is named by nothing
   * short enough to read out in another card's connections.
   */
  @property()
  label = ''

  /** Where the card was placed, kept in its own shadow root. */
  private readonly placement = new PlacementController(this)

  /**
   * @internal Places the card, written by the board: each custom property
   * given, and each one given as `undefined` taken away. Kept in a sheet in the
   * element's own shadow root, since its `style` is the page's.
   */
  place(properties: Readonly<Record<string, string | undefined>>): void {
    this.placement.set(properties)
    this.toggleState('placed', this.placement.get('--_canvas-card-x') !== undefined)
  }

  /** @internal What a custom property was placed at, or `undefined` where it was not. */
  placed(name: string): string | undefined {
    return this.placement.get(name)
  }

  /**
   * The name that connections and events use for this card, unique on its
   * board.
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
   * Prevents the card from being moved, connected, or removed.
   *
   * **The board's own word, meaning the same thing one card at a time.** A
   * board of cards a reader rearranges often has one that anchors it, a start
   * or a title, and this is that card. The board's `readonly` still wins, so a
   * read-only board is read-only whatever its cards say.
   */
  @property({ attribute: 'readonly', reflect: true, type: Boolean })
  readOnly = false

  /**
   * The card's outline: `circle`, `diamond`, `pill`, or `square`. Unset is a
   * rounded box.
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
   * @internal Whether the board lets a reader move this card with its handle,
   * written by the board: the card is selected, and nothing holds it.
   */
  @state()
  movable = false

  /**
   * @internal Whether the board lets a reader resize this card now, written by
   * the board: the card is the one selected, and nothing holds it.
   */
  @state()
  resizable = false

  /**
   * The meaning of the card, shown by its color, in the same tones as other
   * Helix components.
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
   * Focuses the card's `node` part. The host draws no box of its own.
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
      /* **The handle that moves a card without dragging it**, on a selected
         one: a click on the card selects it, so a pointer with no drag had no
         way to move one. A click here picks the card up and the next puts it
         down; a drag carries it the way a drag on the card does. Hidden, the
         keyboard moving a card with Shift and an arrow. */
      this.movable ? html`<span part="move" aria-hidden="true" data-move></span>` : nothing
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
