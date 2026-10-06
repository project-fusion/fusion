import {
  assignSlots,
  type CanvasView,
  capturePointer,
  customElement,
  fillTemplate,
  HelixBeforeMoveEvent,
  HelixBeforeReconnectEvent,
  HelixBeforeRelabelEvent,
  HelixCanvasEditEvent,
  HelixCanvasPanEvent,
  HelixCanvasViewEvent,
  HelixCanvasZoomEvent,
  HelixConnectEvent,
  HelixElement,
  HelixMoveEvent,
  HelixReconnectEvent,
  HelixRelabelEvent,
  HelixRemoveEvent,
  HelixSelectEvent,
  hostAria,
  inlineStep,
  isRtl,
  MixinViewport,
  type MoveDetail,
  type ReconnectDetail,
  type RelabelDetail,
  type ViewportGestureLabels,
  type ViewportPanDetail,
  type ViewportWay,
  type ViewportZoomDetail,
  wordsConverter,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, svg, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { HelixHeadlessCanvasEdge } from '../edge/canvas-edge.js'
import { HelixHeadlessCanvasNode } from '../node/canvas-node.js'
import {
  type CanvasDocument,
  type CanvasEdge,
  type CanvasNode,
  type CanvasSide,
  type CanvasTone,
  colorOf,
  connector,
  ends,
  extent,
  inside,
  port,
  reading,
  sideNear,
} from './canvas-document.js'

export type {
  CanvasDocument,
  CanvasEdge,
  CanvasEdgeProps,
  CanvasEnd,
  CanvasNode,
  CanvasNodeProps,
  CanvasPath,
  CanvasSide,
  CanvasTone,
} from './canvas-document.js'
export { fromJsonCanvas } from './canvas-document.js'

/**
 * The breathing room the plane keeps around the document's own extent.
 *
 * **A board drawn exactly to its extent clips what sits outside it**, and two
 * things do: a group's name, which is drawn above the box it names, and a
 * connector, whose curve bows past the cards it joins. The margin is the same on
 * every side and in the document's own units, so it scales with the zoom like
 * everything else.
 */
const MARGIN = 32

/**
 * The arrowhead, named once inside this shadow root.
 *
 * An id is scoped to the root it is written in, so two boards on one page do not
 * collide and a constant is safe where a generated one would only be noise.
 */
const ARROW = 'canvas-arrow'

/**
 * How far a key press moves a card, in the document's own units.
 *
 * Half the ruling's default spacing, so two presses cross one square and a card
 * moved by keys lands where one moved by hand could.
 */
const NUDGE = 16

/**
 * The least a card can be resized to, in the document's own units: a line of
 * text and a little room around it.
 */
const MIN_WIDTH = 48
const MIN_HEIGHT = 32

/**
 * How far out and how far in the board zooms.
 *
 * **A tenth to eight times.** A quarter was too near to see a large board
 * whole, and four times too far to read what a small card holds, a chart or a
 * picture, at the size it was worth drawing.
 */
const ZOOM_MIN = 0.1
const ZOOM_MAX = 8

/**
 * The zoom the ruling is drawn at, which steps by doubling as the board zooms
 * out so the lines stay far enough apart to be lines.
 *
 * At a tenth, a ruling every 32 units is a line every three pixels, which reads
 * as a gray wash rather than a grid. Doubling the spacing each time it would
 * fall below half keeps every line the coarser ruling draws on one the finer
 * ruling drew, so a card on a line stays on a line.
 */
const ruling = (zoom: number): number =>
  zoom >= 0.5 ? zoom : zoom * 2 ** Math.ceil(Math.log2(0.5 / zoom))

/**
 * How far a pointer travels on a card before a press becomes a drag.
 *
 * A card is also something a reader clicks to focus, or clicks through to a
 * link it holds, and a hand is never perfectly still: without a threshold every
 * click nudged the card it landed on by a pixel or two.
 */
const SLOP = 3

/** Whether an end carries an arrowhead, the format defaulting the two differently. */
const heads = (edge: CanvasEdge): { start: boolean; end: boolean } => ({
  end: (edge.toEnd ?? 'arrow') === 'arrow',
  start: edge.fromEnd === 'arrow',
})

/**
 * What a connection is called in the walk and on the tab stop, before a second
 * one between the same two cards is told apart: see `keyOf` on the board.
 */
const keyBase = (edge: CanvasEdge): string =>
  `edge:${edge.id || `${edge.fromNode}->${edge.toNode}`}`

/** A card moved onto the plane, whose corner is `origin` in the document's units. */
const onPlane = (node: CanvasNode, origin: { x: number; y: number }): CanvasNode => ({
  ...node,
  x: node.x - origin.x,
  y: node.y - origin.y,
})

/**
 * Whether an event began on something inside a card that answers a press
 * itself: a field, a button, a link, text being edited.
 *
 * **Those are the card's, not the board's.** A press on a button in a card
 * dragged the card, and a page editing a card's text in place could not put a
 * caret in it, because every press became a move.
 */
const INTERACTIVE =
  'input, textarea, select, button, a[href], [contenteditable]:not([contenteditable="false"])'

/** One stop in the walk: a card, or a connection leaving one. */
type Stop = { kind: 'node'; key: string } | { kind: 'edge'; key: string; edge: CanvasEdge }

/**
 * A color the page wrote in an element's own `style`, which is where a color
 * with no meaning goes: a tone is a statement and an attribute, a hex is a
 * style. Read from the inline style, because the line is drawn by the board and
 * not by the element, so nothing inherits the value across on its own.
 */
const custom = (element: HTMLElement | undefined, name: string): string =>
  element?.style.getPropertyValue(name).trim() ?? ''

/**
 * A coordinate or a length as a number the geometry can use: nothing where it
 * is not one. An attribute that fails to parse is `NaN`, which compares unequal
 * to itself, so a fit that stops where nothing moved never stopped.
 */
const finite = (value: number): number => (Number.isFinite(value) ? value : 0)

/** A length as a card places it, or nothing where there is none. */
const size = (value: number): string | undefined => (value > 0 ? `${value}px` : undefined)

/**
 * @summary A board of cards and the connections between them, which can be navigated, rearranged, and connected.
 *
 * @description
 * A board of cards and connectors, drawn by Helix. On a canvas every position
 * is data that someone placed, so drawing is arithmetic over rectangles with no
 * layout to compute. `Map` takes a slotted map, because another renderer draws
 * its tiles.
 *
 * The format is [JSON Canvas](https://jsoncanvas.org), an open format. Each
 * node has an `x`, `y`, `width`, `height`, and a type. Each edge names the two
 * nodes it joins and the sides it leaves and arrives on. A card belongs to a
 * group when it sits inside the group's bounds.
 *
 * The cards are text in the DOM, so a screen reader can read them. The family
 * adds a reading order and states each card's connections as text. `order` sets
 * the reading order:
 * - `spatial` bands the cards into rows.
 * - `edges` follows the arrows, starting from the cards that nothing points to.
 *
 * **Cards move by default.** The board writes the new `x` and `y` onto the
 * card, the way an input writes its own value, and dispatches two events:
 * - `helix-before-move` for every step. Cancel it to hold the positions in your
 *   own state and apply them yourself.
 * - `helix-move` once the move is finished.
 *
 * A resize dispatches the same pair with a size. Set `readonly` on the board to
 * keep every card in place, such as on a published board. Set `readonly` on one
 * card or connection to keep only that one in place.
 *
 * Keyboard behavior:
 * - One card holds the board's tab stop.
 * - The arrow keys move through the cards in reading order. The card you land
 *   on scrolls into view, and its connections are announced with it.
 * - Shift with an arrow key moves the card.
 * - The connections leaving a card are stops of their own, straight after it.
 *   Enter on one moves to the card it arrives at.
 *
 * Every drag also works with clicks, as WCAG 2.5.7 requires for a pointer that
 * cannot hold a button down. Click a selected card's move handle, a corner, a
 * card's connection point, or the end of a selected connection to pick it up.
 * It follows the pointer with no button held, and the next click puts it down
 * where a drag would have. On touch, the next tap sets where it lands. Escape,
 * or a press outside the board, puts it back. So a finger connects two cards
 * with three taps: the card, one of its points, and the card to connect to.
 *
 * Connecting and removing dispatch requests, and your code applies them:
 * - Drawing from a card's handle to another card, or pressing C on one card and
 *   Enter on another, dispatches `helix-connect`.
 * - Delete on a card or a connection dispatches `helix-remove`. The event names
 *   every connection that removing the card would leave without an end.
 *
 * The board applies a move itself, because the card already exists. A
 * connection is a new element, and React discards an element the board adds to
 * its markup on the next render, so you write the connection.
 *
 * Cards and connections are `helix-canvas-node` and `helix-canvas-edge`
 * elements, so they are in the served markup whichever renderer wrote them. The
 * library fetches nothing, and an array passed to an element is missing from
 * the first paint of a server-rendered React page. `fromJsonCanvas` turns a
 * JSON Canvas document into their props, and `toJsonCanvas()` writes a board
 * back out.
 *
 * @since 0.100.0
 * @status experimental
 * @category media
 * @aliases Board, JSON Canvas, Whiteboard
 * @documentation https://fusion.dev/helix/components/canvas
 *
 * @slot - The board's `helix-canvas-node` and `helix-canvas-edge` elements, drawn on the plane.
 * @slot empty - Content shown when the document has no nodes.
 * @slot footer - Content below the board.
 * @slot header - Content above the board.
 *
 * @event {HelixBeforeMoveEvent} helix-before-move - Cards are about to move. Cancelable: cancel it to keep the positions in your own state.
 * @event {HelixBeforeReconnectEvent} helix-before-reconnect - A connection's end is about to move to another card or side. Cancelable: cancel it to keep connections in your own state.
 * @event {HelixBeforeRelabelEvent} helix-before-relabel - A connection's label or a group's name is about to change. Cancelable: cancel it to keep labels in your own state.
 * @event {HelixCanvasEditEvent} helix-canvas-edit - A card was double-clicked, or Enter or F2 was pressed on it. Open your own editor for the card.
 * @event {HelixCanvasPanEvent} helix-canvas-pan - The board moved one step, from its controls or the arrow keys. A drag sends `helix-canvas-view`.
 * @event {HelixCanvasViewEvent} helix-canvas-view - The board's view changed, by any means. The detail is the new view.
 * @event {HelixCanvasZoomEvent} helix-canvas-zoom - The board zoomed one step, from its controls or the keys. A wheel or a pinch sends `helix-canvas-view`.
 * @event {HelixConnectEvent} helix-connect - Two cards were chosen to be joined. Add a `helix-canvas-edge` to join them.
 * @event {HelixMoveEvent} helix-move - Cards moved and the move is finished: a drag was released, a click put a card down, or a key was pressed.
 * @event {HelixReconnectEvent} helix-reconnect - A connection's end moved, and the move is finished.
 * @event {HelixRelabelEvent} helix-relabel - A connection's label or a group's name changed.
 * @event {HelixRemoveEvent} helix-remove - Cards or connections were chosen for removal. Remove the elements it names.
 * @event {HelixSelectEvent} helix-select - The selection changed. The detail's `value` is the names, comma separated, empty for none. Cancelable: canceling it keeps the selection as it was.
 *
 * @csspart arrow - The arrowhead at an end of a connection that has one.
 * @csspart board - The plane the cards are placed on, which pans and zooms.
 * @csspart controls - The group the pan and zoom buttons sit in.
 * @csspart draft - The connection being drawn, before `helix-connect` is sent.
 * @csspart edge - One connector between two cards.
 * @csspart edge-end - An end of a selected connection. Drag it, or click it to pick it up.
 * @csspart edge-target - A wider, invisible line over a connection, which receives focus and presses.
 * @csspart edges - A layer the connectors are drawn in: one holding the arrowhead, and one after each card holding the connections leaving it, so they are read in the order the arrows walk them. Give it `z-index: -1` to draw it under the cards.
 * @csspart footer - The strip below the board.
 * @csspart fullscreen - The button that makes the board fill the screen.
 * @csspart gesture-hint - Words over the board for a moment when it lets a gesture pass to the page, such as how to zoom it.
 * @csspart gesture-status - The line shown while a board with `gestures="activate"` has the gestures.
 * @csspart header - The strip above the board.
 * @csspart label - The label on a connector.
 * @csspart label-editor - The field for editing a connection's label or a group's name, placed over that text.
 * @csspart live - A live region that screen readers announce while a connection is being made.
 * @csspart marquee - The box a Shift-drag across the empty board draws, which selects the cards it touches.
 * @csspart pan-down - The button that moves the board down.
 * @csspart pan-end - The button that moves the board toward the end of a line of text: right in English.
 * @csspart pan-start - The button that moves the board toward the start of a line of text: left in English.
 * @csspart pan-up - The button that moves the board up.
 * @csspart region - The named region the board is drawn in.
 * @csspart viewport - The box the board is drawn inside.
 * @csspart zoom-in - The button that zooms in.
 * @csspart zoom-out - The button that zooms out.
 *
 * @cssstate connecting - While you draw a connection.
 * @cssstate direct - The board moves without easing, while you drag it or while it settles into its box.
 * @cssstate empty - While the document has no nodes.
 * @cssstate fullscreen - While the board fills the screen.
 * @cssstate holding - An item picked up with a click follows the pointer until the next press puts it down.
 * @cssstate idle - The user has been still for `idle-delay` milliseconds. The board's own controls stay; select on it to hide chrome of your own.
 * @cssstate pressing - While a press on the board, its cards or its connections is under way.
 * @cssstate sharing - The page keeps the plain wheel and one finger, with `gestures="cooperative"` or while a board with `gestures="activate"` waits to be pressed.
 * @cssstate using - A board with `gestures="activate"` has been pressed and has the gestures.
 */
@customElement('helix-headless-canvas')
export class HelixHeadlessCanvas extends MixinViewport(HelixElement) {
  /** The connection whose target had focus as an update began, and that target. */
  private focusedEdge: { key: string; target: Element } | undefined

  /** Each card is assigned to its own slot, in the order the arrows walk them. */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixElement.shadowRootOptions,
    slotAssignment: 'manual',
  }

  /** The text read with a card to say where its connections come from, with `{cards}`. */
  @property({ attribute: 'comes-from-label' })
  comesFromLabel = 'from {cards}'

  /** The text announced when a connection is requested, with `{from}` and `{to}`. */
  @property({ attribute: 'connected-label' })
  connectedLabel = 'Asked to connect {from} to {to}.'

  /**
   * The text announced when a connection is started, with `{from}` filled in.
   *
   * **Every sentence this board speaks is a property**, the rule the pan
   * controls already kept with `pan-up-label` and its three: a board on a page in another
   * language otherwise read its connections out in English.
   */
  @property({ attribute: 'connecting-label' })
  connectingLabel =
    'Connecting from {from}. Move to another card and press Enter, or Escape to stop.'

  /**
   * The accessible name of a connection, with `{from}` and `{to}`.
   *
   * Its own label, where it has one, is its description rather than part of
   * this, so a reader hears the ends first and what the line says after.
   */
  @property({ attribute: 'connection-label' })
  connectionLabel = 'From {from} to {to}'

  /**
   * The accessible name for the board. Required.
   *
   * A document has no name of its own in the format, and "Canvas" names the
   * widget rather than the thinking on it.
   */
  @property()
  label = ''

  /**
   * The accessible name of the field for editing a label, with `{name}` for what
   * the label belongs to.
   */
  @property({ attribute: 'label-editor-label' })
  labelEditorLabel = 'Label for {name}'

  /**
   * The text read with a card to say where its connections go, with `{cards}`
   * as the list.
   *
   * The list is joined the way the page's language joins one, "Second and
   * Third", rather than with a comma this component chose.
   */
  @property({ attribute: 'leads-to-label' })
  leadsToLabel = 'leads to {cards}'

  /**
   * The order the arrow keys and screen readers move through the cards:
   * `spatial` or `edges`.
   *
   * `spatial` bands them into rows and reads each row across, which is how a
   * person reads a board laid out on a grid and is a heuristic a loose board
   * defeats. `edges` follows the arrows from the cards nothing points to, which
   * on a board that is a flow is the order its author meant.
   *
   * Absent is spatial, a resting value being an attribute's absence: a default
   * that reflected would write a choice onto every host that no server sent.
   */
  @property({ reflect: true })
  order?: 'spatial' | 'edges'

  /**
   * The route every connection takes when it sets no `path` of its own:
   * `straight`, or `step` for right angles.
   *
   * Absent is a curve. A flowchart wants `step` on all of its edges, and
   * writing it once here rather than on each is the reason this exists; an
   * edge's own `path` still wins.
   */
  @property({ reflect: true })
  path?: 'straight' | 'step'

  /**
   * Prevents every card from being moved, connected, or removed.
   *
   * **The attribute is `readonly`, which is the platform's spelling**, and the
   * reverse of an `editable` switch on purpose: a form control takes input
   * unless it is told not to, and a board a reader can rearrange is the same
   * kind of thing. A drag on a card pans the board instead, and the keys still
   * walk the cards.
   */
  @property({ attribute: 'readonly', reflect: true, type: Boolean })
  readOnly = false

  /**
   * The text announced when a connection's end is picked up, with `{from}` and
   * `{to}`.
   */
  @property({ attribute: 'reconnecting-label' })
  reconnectingLabel =
    'Moving the end of the connection from {from} to {to}. Move to a card and press Enter, or Escape to stop.'

  /**
   * The names of the selected cards and connections, comma separated. Empty
   * when nothing is selected.
   *
   * **Comma separated, the way `Listbox` writes a multiple value**, so a page
   * reads one selection the same way wherever it comes from. A click, or a key
   * that lands on one, selects it alone; Shift, Command or Control with a click
   * adds or takes one away, and so does Space; Command or Control with A
   * selects everything; Shift and a drag across the empty board selects the
   * cards the box touches. A click on the empty board, or Escape, selects
   * nothing. Dragging, Shift with an arrow, and Delete act on the whole
   * selection.
   *
   * **Kept apart from focus**, so it stays when focus leaves: a reader who
   * selects cards and clicks a button beside the board to act on them has not
   * cleared what the button acts on by clicking. A connection with no name is
   * called by its ends, `from->to`, which is also why a name has to be unique
   * on its board across cards and connections both, and may not hold a comma.
   *
   * Written to select from outside, and read to act on the selection.
   */
  @property()
  selected = ''

  /**
   * A label being edited in place: whose, and what it said before.
   */
  @state()
  private editing: { target: 'edge' | 'group'; key: string; was: string } | undefined

  /** The text announced when a connection is stopped before it is requested. */
  @property({ attribute: 'stopped-label' })
  stoppedLabel = 'Stopped connecting.'

  /**
   * What each tone means on this board, in words read out with the cards and
   * connections in it, such as `{"danger": "Blocked", "success": "Done"}`.
   *
   * **Named by the page, since the tone names a color and the page gives it
   * its meaning.** JSON Canvas leaves its six colors to the application, so
   * red is "blocked" on one board and "urgent" on the next. A reader who can
   * see the board is told by the color; this is how a reader who cannot is
   * told the same. A tone left out is not read.
   */
  @property({ attribute: 'tone-labels', converter: wordsConverter })
  toneLabels: Partial<Record<CanvasTone, string>> = {}

  /** The card or connection that holds the board's one tab stop, by its key. */
  @state()
  private stop: string | undefined

  /**
   * A connection being made: the card it starts from, the side where a pointer
   * started it, and where the pointer is, in the document's own units.
   */
  @state()
  private linking:
    | {
        from: string
        side?: CanvasSide | undefined
        pointer?: number | undefined
        at?: { x: number; y: number } | undefined
        /** The card it would arrive at if it were let go now. */
        to?: string | undefined
        /**
         * The card under the pointer, whether or not it can be arrived at. A
         * connection's end let go over a held card or its own other end stays
         * where it was; only one let go over no card at all is pulled off.
         */
        over?: string | undefined
        /** The side of that card nearest the pointer, where there is a pointer. */
        toSide?: CanvasSide | undefined
        /**
         * The connection whose end is being moved, where one is: `from` is
         * then the end that stays, and `moving` says which end is in hand.
         */
        edge?: string | undefined
        moving?: 'from' | 'to' | undefined
        /** Where a press on a connection began, until it has moved far enough to be a drag. */
        pressed?: { x: number; y: number } | undefined
        /** Where a press on a handle or an end began, to tell a click from a drag. */
        origin?: { x: number; y: number } | undefined
        /** Whether it was picked up by a click and is carried until the next one. */
        held?: boolean
      }
    | undefined

  /** What the live region says, which is only ever about a connection being made. */
  @state()
  private said = ''

  /**
   * Where focus goes once something a reader removed has gone.
   *
   * **Held until the page acts**, because the board only asks: React removes the
   * element on its next render rather than inside the listener, so moving focus
   * at the moment of asking would move it off an element that is still there,
   * or, for a page that declines, off one that stays.
   */
  private refocus: { gone: string[]; next: string | undefined } | undefined

  /**
   * Where the plane's corner was on the last render, in the document's units.
   *
   * **A card moved past the edge of the board moves the corner**, since the
   * plane is sized to what it holds, and every card is placed from that corner:
   * without holding the view against it, dragging one card left slid every
   * other card right by the same distance.
   */
  private origin?: { x: number; y: number }

  /** Where the board sits, in board coordinates, and how far it is zoomed. */
  @state()
  private at = { x: 0, y: 0, zoom: 1 }

  /**
   * Whether the move under way should land rather than glide: the reader's own
   * hand, or the board settling into its box.
   *
   * **A drag must not be eased, and that is what made it feel like it snapped.**
   * The plane carries a transition so a press on the pad glides rather than
   * jumping, and a drag writes a new transform on every pointer move: each one
   * was then animated toward the last, so the board chased the pointer a
   * fraction behind and arrived in steps. Continuous input is direct and
   * discrete input is eased, which is the rule a map or an editor follows.
   */
  @state()
  private direct = false

  /**
   * Whether the reader has moved the board, which is what stops it re-fitting.
   *
   * A board opens showing all of itself, and keeps doing so while the box it is
   * drawn in settles: a list wraps to a second row, a panel opens, a container
   * resizes. The moment a reader pans or zooms they have chosen a view, and a
   * later resize must not take it away from them.
   */
  private touched = false

  /** Watches the box, because the fit is a fraction of a measurement. */
  private sizes?: ResizeObserver

  /** The element the observer is on, so a render does not observe it again. */
  private watched: Element | undefined

  /**
   * Hears what the cards and connections change that no property of theirs
   * says: the words in a card, and a color written into an element's `style`.
   *
   * Both are read into what is drawn, a card's words into every connection's
   * name and the sentence saying where it leads, and neither reaches the board
   * otherwise: a card whose text a page rewrote was read out under its old
   * words for the life of the board.
   */
  private words?: MutationObserver

  /** The custom color each card and connection was last drawn in. */
  private readonly painted = new WeakMap<Element, string>()

  /** Where each card was last written to be, so one that did not move is left alone. */
  private readonly placed = new WeakMap<Element, string>()

  /** The box as the observer last measured it, so a resize knows what it gained. */
  private measured?: { width: number; height: number }

  /**
   * The box the board is drawn in, which is not the host.
   *
   * **The host measures nothing**: it draws no box of its own, so `clientWidth`
   * on it is zero and every sum against it is zero too. The viewport inside the
   * shadow root is the thing with a size, and it is what a fit, a pan step and a
   * card brought to the middle are all fractions of.
   */
  private get box(): { width: number; height: number } {
    const viewport = this.renderRoot?.querySelector('[part="viewport"]')
    return {
      height: viewport?.clientHeight ?? 0,
      width: viewport?.clientWidth ?? 0,
    }
  }

  /**
   * The cards, read from the light DOM.
   *
   * **`children` and not a slot**, which is what every family here that reads
   * its own contents does, and it is undefined on the server: a board cannot
   * count its cards while it is being rendered, so the plane, the connectors and
   * the reading list are assembled on hydration and the cards themselves are in
   * the served markup because the consumer wrote them there.
   */
  private get cards(): HelixHeadlessCanvasNode[] {
    /* **`knownChildren`, which is the base class's answer to the whole hazard.**
       A server has no children and a hydrating render must not read them, or it
       renders something other than what it is hydrating and Lit throws at the
       part where the two disagree. So the cards are read on the update after
       hydration, which `finishHydration` asks for. */
    return this.remember('cards', () =>
      this.knownChildren.filter(
        (child): child is HelixHeadlessCanvasNode => child instanceof HelixHeadlessCanvasNode,
      ),
    )
  }

  /** A card by its name, looked up rather than searched for. */
  private get byName(): Map<string, HelixHeadlessCanvasNode> {
    return this.remember('byName', () => new Map(this.cards.map((card) => [card.name, card])))
  }

  /** A card's geometry by its name. */
  private get byId(): Map<string, CanvasNode> {
    return this.remember('byId', () => new Map(this.nodes.map((node) => [node.id, node])))
  }

  /**
   * What the board reads from its children, kept for the rest of the turn.
   *
   * **Read once rather than on every question.** A render asked for the cards,
   * the connections and the reading order a dozen times over, and the
   * selection asked for the reading order once per name in it: every step of a
   * drag rebuilt all of them from the DOM that many times. Cleared when an
   * update is asked for, which every change the board makes or hears about
   * does, and at the end of the turn, so a question asked later reads again.
   */
  private cache: {
    nodes?: CanvasNode[]
    edges?: CanvasEdge[]
    walk?: Stop[]
    /* **And the indexes into them**, because a board asked "which card is
       this" once per card, and each answer was a search of every card: a
       drag of 400 selected cards took 50ms a step and of 800, 174ms. */
    cards?: HelixHeadlessCanvasNode[]
    byName?: Map<string, HelixHeadlessCanvasNode>
    byId?: Map<string, CanvasNode>
    groups?: CanvasNode[]
    stops?: Set<string>
    picked?: string[]
    links?: Map<string, string>
  } = {}

  private remember<K extends keyof HelixHeadlessCanvas['cache']>(
    key: K,
    compute: () => NonNullable<HelixHeadlessCanvas['cache'][K]>,
  ): NonNullable<HelixHeadlessCanvas['cache'][K]> {
    const cache = this.cache
    if (Object.keys(cache).length === 0) {
      queueMicrotask(() => {
        if (this.cache === cache) {
          this.cache = {}
        }
      })
    }
    cache[key] ??= compute()
    return cache[key] as NonNullable<HelixHeadlessCanvas['cache'][K]>
  }

  /**
   * @internal Forgets what the board read from its children, then asks for an
   * update as Lit does: every change the board makes or hears about asks for
   * one, which makes this the one place the reading goes stale.
   */
  override requestUpdate(
    name?: PropertyKey,
    oldValue?: unknown,
    options?: Parameters<HelixElement['requestUpdate']>[2],
  ): void {
    this.cache = {}
    super.requestUpdate(name, oldValue, options)
  }

  /** The same, as the shape the geometry works in. */
  private get nodes(): CanvasNode[] {
    return this.remember('nodes', () => this.readNodes())
  }

  private readNodes(): CanvasNode[] {
    return this.cards.map((card) => ({
      color: colorOf(card.tone, this.paint(card, '--canvas-node-color')),
      height: finite(card.height),
      id: card.name,
      /* An empty label is no label: `??` falls through on nothing at all, and a
         card that named itself with the empty string would be read out as one. */
      label: card.label || undefined,
      text: card.textContent?.trim() || undefined,
      type: card.group ? 'group' : 'text',
      width: finite(card.width),
      x: finite(card.x),
      y: finite(card.y),
    }))
  }

  /** A custom color written on an element, remembered as the one drawn. */
  private paint(element: HTMLElement, name: string): string {
    const value = custom(element, name)
    this.painted.set(element, value)
    return value
  }

  /** The connectors a consumer declared, which draw nothing themselves. */
  private get edges(): CanvasEdge[] {
    return this.remember('edges', () => this.readEdges())
  }

  /**
   * The sides each connection was first drawn from and to, where it names none.
   *
   * **Chosen once, and kept while the cards move.** A connection that names no
   * side takes the ones facing the other card, and that was asked on every
   * draw: a card dragged past the diagonal between the two flipped the answer,
   * and the connection jumped from one point to another under the reader's
   * hand. So the first answer is remembered for as long as the connection joins
   * the same two cards, and a side the page writes still wins. Keyed on the two
   * cards as well as the connection, so a reconnected one chooses again.
   */
  private readonly sides = new Map<string, { cards: string; from: CanvasSide; to: CanvasSide }>()

  private readEdges(): CanvasEdge[] {
    const byName = new Map(this.nodes.map((node) => [node.id, node]))
    return this.edgeElements
      .map((element) => ({ element, key: this.keyOfElement(element) }))
      .map(({ element, key }) => {
        const read = (edge: CanvasEdge): CanvasEdge => {
          this.edgeKeys.set(edge, key)
          return edge
        }
        const edge: CanvasEdge = {
          color: colorOf(element.tone, this.paint(element, '--canvas-edge-color')),
          fromEnd: element.fromEnd,
          fromNode: element.from,
          fromSide: element.fromSide,
          id: element.name,
          label: element.label,
          path: element.path,
          toEnd: element.toEnd,
          toNode: element.to,
          toSide: element.toSide,
        }
        if (edge.fromSide !== undefined && edge.toSide !== undefined) {
          return read(edge)
        }
        const from = byName.get(edge.fromNode)
        const to = byName.get(edge.toNode)
        if (!from || !to) {
          return read(edge)
        }
        const cards = `${edge.fromNode}->${edge.toNode}`
        let kept = this.sides.get(key)
        if (kept?.cards !== cards) {
          const drawn = ends(edge, from, to)
          kept = { cards, from: drawn.fromSide, to: drawn.toSide }
          this.sides.set(key, kept)
        }
        return read({
          ...edge,
          fromSide: edge.fromSide ?? kept.from,
          toSide: edge.toSide ?? kept.to,
        })
      })
  }

  /** The events this family names for itself, the surface being shared. */
  protected override panEvent(detail: ViewportPanDetail): Event {
    return new HelixCanvasPanEvent(detail)
  }

  protected override zoomEvent(detail: ViewportZoomDetail): Event {
    return new HelixCanvasZoomEvent(detail)
  }

  protected override get restingControlsLabel(): string {
    return 'Board controls'
  }

  /** What the board says about its gestures where the page does not say it. */
  protected override get restingGestureLabels(): ViewportGestureLabels {
    return {
      activate: 'Press the board to use it',
      twoFinger: 'Use two fingers to move the board',
      using: 'Using the board. Press Escape to scroll the page again.',
      wheel: 'Use {key} and scroll to zoom the board',
    }
  }

  /**
   * Zoom and fullscreen, without the pad.
   *
   * A board is dragged, and its cards walked with the arrow keys, so the four
   * pan buttons were a third way to do what two others already did, and they
   * took a third of the frame's corner. `controls="pan zoom fullscreen"` puts
   * them back.
   */
  protected override get restingControls(): string {
    return 'zoom fullscreen'
  }

  /**
   * Moves the board, and says so.
   *
   * **`Map` asks and this tells.** The mixin's `pan` announces a request, which
   * is all a frame around somebody else's map can do; here the board is drawn
   * from a document this component holds, so the same press moves it. The event
   * still goes out, because a consumer keeping a minimap or a scroll position in
   * step needs to hear it, and it is not cancelable for the same reason: it
   * reports rather than asks.
   */
  override pan(to: ViewportWay): void {
    this.direct = false
    /* **The board's own width where the box has not been measured.** `panStep`
       is a fraction of what is on screen, and before the first layout, or in a
       test with no boxes, that is zero: every press would move the board by
       nothing and the reader would think the control was broken. The plane is
       the other thing with a width, and a fraction of it is the same gesture. */
    const across = this.box.width || extent(this.nodes).width
    const step = across * this.panStep
    /* The way the text runs, which a right-to-left page reverses: the pad's
       labels and the arrow keys already said so, and the board moved the other
       way from what they promised. */
    const inline = isRtl(this) ? -step : step
    const by = {
      down: { x: 0, y: -step },
      end: { x: -inline, y: 0 },
      start: { x: inline, y: 0 },
      up: { x: 0, y: step },
    }[to]
    this.touched = true
    this.at = { ...this.at, x: this.at.x + by.x, y: this.at.y + by.y }
    super.pan(to)
  }

  /**
   * Zooms the board about the middle of the view, and says so.
   *
   * **The middle, not the corner, and the difference is whether zooming is
   * usable.** The plane scales from its own origin, so leaving the offset alone
   * grows the board away from the top-left: what a reader was looking at slides
   * out of the box and they have to pan it back after every press. Holding the
   * center point still is two lines of arithmetic and it is what every canvas
   * does.
   *
   * Held between a tenth and eight times, which is far enough out to see a
   * large board whole and far enough in to read what a small card holds.
   */
  override zoom(by: number): void {
    this.direct = false
    this.touched = true
    this.zoomAbout(by > 0 ? 1.25 : 1 / 1.25, { x: this.box.width / 2, y: this.box.height / 2 })
    super.zoom(by)
  }

  /**
   * Brings a card, by name, to the middle of the viewport.
   *
   * What a reader landing on a card off the edge of the view gets, and what a
   * page's own search or outline can call to take a reader to one.
   */
  show(name: string): void {
    this.direct = false
    const node = this.byId.get(name)
    if (!node) {
      return
    }
    this.touched = true
    this.stop = name
    const board = extent(this.nodes)
    const origin = { x: board.x - MARGIN, y: board.y - MARGIN }
    const middle = {
      x: (node.x - origin.x + node.width / 2) * this.at.zoom,
      y: (node.y - origin.y + node.height / 2) * this.at.zoom,
    }
    this.at = {
      ...this.at,
      x: this.box.width / 2 - middle.x,
      y: this.box.height / 2 - middle.y,
    }
  }

  /**
   * Whether a press on the board is under way, a drag of the board, a card or
   * a connection, so a stylesheet can stop the press selecting text while it
   * lasts and only then: a board that never let its text be selected also
   * never let a page's own editor type into a card.
   */
  @state()
  private pressing = false

  /**
   * Whether the press under way began on a card or a connection, so the focus
   * it moves is not also read as a keyboard landing, which selects.
   */
  private pointing = false

  /** A box being drawn across the empty board, in the document's units. */
  @state()
  private marquee:
    | {
        pointer: number
        from: { x: number; y: number }
        to: { x: number; y: number }
        base: string[]
      }
    | undefined

  /** A card being resized from a corner, with the box it started from. */
  private sizing:
    | {
        pointer: number
        corner: string
        card: HelixHeadlessCanvasNode
        from: { x: number; y: number }
        start: { x: number; y: number; width: number; height: number }
        moved?: MoveDetail
        /** Whether a step was asked for, applied here or refused for the page to apply. */
        asked?: boolean
        /** Whether it was picked up by a click and is carried until the next one. */
        held?: boolean
      }
    | undefined

  /** Where each finger on the board is, by pointer, which a pinch is measured from. */
  private readonly fingers = new Map<number, { x: number; y: number }>()

  /**
   * A pinch under way: how far apart its fingers were and the point between
   * them, in the box, and the view, when the second finger landed.
   */
  private pinching:
    | {
        at: { x: number; y: number; zoom: number }
        middle: { x: number; y: number }
        spread: number
      }
    | undefined

  /** Where a drag started, and where the board was when it did. */
  private dragging:
    | {
        pointer: number
        from: { x: number; y: number }
        at: { x: number; y: number }
        /** The card or connection the press was on, where a held one panned instead. */
        pressed?: string | undefined
      }
    | undefined

  /**
   * A press on a card that may become a move, with where everything it carries
   * started. `moved` is what the last step settled on, which the drop reports.
   */
  private carrying:
    | {
        /** Whether a modifier was held, which makes a click add or take away. */
        adding: boolean
        /** The card the press was on, which a click selects. */
        pressed: string
        pointer: number
        from: { x: number; y: number }
        started: boolean
        cards: Array<{ card: HelixHeadlessCanvasNode; x: number; y: number }>
        moved?: MoveDetail
        /** Whether a step was asked for, applied here or refused for the page to apply. */
        asked?: boolean
        /** Whether the press was on the card's move handle, which only ever carries. */
        handle?: boolean
        /** Whether it was picked up by a click and is carried until the next one. */
        held?: boolean
      }
    | undefined

  /**
   * Every stop in the order the arrows walk them: each card in reading order,
   * then the connections leaving it.
   */
  private get walk(): Stop[] {
    return this.remember('walk', () => this.readWalk())
  }

  private readWalk(): Stop[] {
    const edges = this.edges
    /* Only a connection that is drawn, which is one whose two cards are both
       there: a stop with nothing to focus held the arrow keys on the card
       before it for good. */
    const ids = new Set(this.nodes.map((node) => node.id))
    const leaving = new Map<string, Stop[]>()
    for (const edge of edges) {
      if (ids.has(edge.toNode)) {
        const stop: Stop = { edge, key: this.keyOf(edge), kind: 'edge' }
        leaving.set(edge.fromNode, [...(leaving.get(edge.fromNode) ?? []), stop])
      }
    }
    return reading(this.nodes, edges, this.order ?? 'spatial').flatMap((node): Stop[] => [
      { key: node.id, kind: 'node' },
      ...(leaving.get(node.id) ?? []),
    ])
  }

  /** Focuses a stop, a card by its own method and a connection by its target. */
  private focusStop(key: string | undefined): void {
    if (key === undefined) {
      return
    }
    if (key.startsWith('edge:')) {
      const target = [...(this.renderRoot?.querySelectorAll('[data-edge]') ?? [])].find(
        (one) => one.getAttribute('data-edge') === key,
      )
      ;(target as SVGElement | undefined)?.focus()
      return
    }
    this.byName.get(key)?.focus()
  }

  /** The connection an event came from, where it came from one. */
  private edgeOf(event: Event): string | undefined {
    const origin = event.composedPath()[0]
    return origin instanceof Element ? (origin.getAttribute('data-edge') ?? undefined) : undefined
  }

  /** A point on screen, in the document's own units. */
  private toDocument(event: { clientX: number; clientY: number }): { x: number; y: number } {
    const box = this.partNamed('viewport')?.getBoundingClientRect()
    const origin = this.origin ?? { x: 0, y: 0 }
    return {
      x: origin.x + (event.clientX - (box?.left ?? 0) - this.at.x) / this.at.zoom,
      y: origin.y + (event.clientY - (box?.top ?? 0) - this.at.y) / this.at.zoom,
    }
  }

  /**
   * The card under a point, the smallest where they overlap, so a card inside
   * a group is found before the group around it.
   */
  private cardAt(point: { x: number; y: number }): CanvasNode | undefined {
    return this.nodes
      .filter(
        (one) =>
          point.x >= one.x &&
          point.x <= one.x + one.width &&
          point.y >= one.y &&
          point.y <= one.y + one.height,
      )
      .sort((a, b) => a.width * a.height - b.width * b.height)[0]
  }

  /** What a card is called, by id, for what the live region says. */
  private nameOf(id: string): string {
    const node = this.byId.get(id)
    return node ? this.textOf(node) : id
  }

  /** Starts a connection from a card, from the keyboard. */
  private startLinking(from: string): void {
    this.linking = { from }
    this.said = fillTemplate(this.connectingLabel, { from: this.nameOf(from) })
  }

  /**
   * A card a connection could arrive at, or nothing: not the card it started
   * from, and not one that is held.
   */
  private arrival(name: string | undefined): string | undefined {
    const card = this.cardNamed(name)
    return card && name !== this.linking?.from && !this.fixed(card) ? name : undefined
  }

  /**
   * Whether a connection is being drawn, which a press on a connection is not
   * until it moves.
   *
   * **A click on a connection is a click.** The press picks up the nearer end
   * so a drag can start from it, and every card lit up its handles for as long
   * as the button was down: a reader selecting a line watched the whole board
   * flash as though they had started connecting.
   */
  private get drawing(): boolean {
    return this.linking !== undefined && this.linking.pressed === undefined
  }

  /** Ends a connection, asking for it where it has somewhere to go. */
  private finishLinking(to: string | undefined, toSide?: CanvasSide): void {
    const linking = this.linking
    if (linking?.edge !== undefined) {
      this.finishReconnect(to, toSide)
      return
    }
    const arriving = this.arrival(to)
    this.linking = undefined
    if (!linking || arriving === undefined) {
      this.said = linking ? this.stoppedLabel : ''
      return
    }
    this.said = fillTemplate(this.connectedLabel, {
      from: this.nameOf(linking.from),
      to: this.nameOf(arriving),
    })
    this.dispatchEvent(
      new HelixConnectEvent({
        from: linking.from,
        to: arriving,
        ...(linking.side === undefined ? {} : { fromSide: linking.side }),
        ...(toSide === undefined ? {} : { toSide }),
      }),
    )
  }

  /**
   * Picks up one end of a connection, from the keyboard or a drag.
   *
   * The end in hand is the one a drag started nearer, and `to` from the
   * keyboard, where there is no nearer; the other end stays where it is,
   * side and all.
   */
  private startReconnect(key: string, moving: 'from' | 'to', pointer?: PointerEvent): void {
    const edge = this.edges.find((one) => this.keyOf(one) === key)
    if (!edge) {
      return
    }
    const stays = moving === 'to' ? edge.fromNode : edge.toNode
    /* **The end that stays keeps the side it is drawn on**, named or not. An
       end with no side named is drawn at whichever faces the other card, and
       the other card is what the reader is moving: left to work it out again,
       the end that was meant to stay slid round its card with the pointer and
       jumped again over every card it passed, and read as a different
       connection being picked up. */
    const byId = new Map(this.nodes.map((one) => [one.id, one]))
    const fromNode = byId.get(edge.fromNode)
    const toNode = byId.get(edge.toNode)
    const drawn = fromNode && toNode ? ends(edge, fromNode, toNode) : undefined
    this.linking = {
      edge: key,
      from: stays,
      moving,
      side: moving === 'to' ? drawn?.fromSide : drawn?.toSide,
      ...(pointer ? { at: this.toDocument(pointer), pointer: pointer.pointerId } : {}),
    }
    this.said = pointer
      ? ''
      : fillTemplate(this.reconnectingLabel, {
          from: this.nameOf(edge.fromNode),
          to: this.nameOf(edge.toNode),
        })
  }

  /**
   * Lets go of a connection's end: onto a card, which moves it there; or onto
   * nothing, which asks for the connection to go.
   *
   * **Dropped on nothing is a disconnect**, which is what a reader pulling a
   * line off a card means, and what every editor with draggable ends does. It
   * is a request like Delete, because the element is the page's to remove.
   */
  private finishReconnect(to: string | undefined, toSide?: CanvasSide): void {
    const linking = this.linking
    this.linking = undefined
    const edge = linking ? this.edges.find((one) => this.keyOf(one) === linking.edge) : undefined
    if (!linking || !edge || linking.edge === undefined) {
      return
    }
    const arriving = to === undefined || to === linking.from ? undefined : to
    if (arriving === undefined || this.fixed(this.cardNamed(arriving))) {
      this.said = linking.pointer === undefined ? this.stoppedLabel : ''
      if (linking.pointer !== undefined && to === undefined) {
        this.requestRemove(linking.edge)
      }
      return
    }
    const detail: ReconnectDetail =
      linking.moving === 'from'
        ? {
            from: arriving,
            name: edge.id,
            to: edge.toNode,
            was: { from: edge.fromNode, to: edge.toNode },
            ...(toSide === undefined ? {} : { fromSide: toSide }),
            ...(linking.side === undefined ? {} : { toSide: linking.side }),
          }
        : {
            from: edge.fromNode,
            name: edge.id,
            to: arriving,
            was: { from: edge.fromNode, to: edge.toNode },
            ...(linking.side === undefined ? {} : { fromSide: linking.side }),
            ...(toSide === undefined ? {} : { toSide }),
          }
    this.said = ''
    if (!this.dispatchEvent(new HelixBeforeReconnectEvent(detail))) {
      return
    }
    const element = this.edgeElement(linking.edge)
    if (element) {
      element.from = detail.from
      element.to = detail.to
      element.fromSide = detail.fromSide
      element.toSide = detail.toSide
      this.rekey(linking.edge, this.keyOfElement(element))
    }
    /* Said from the keyboard, as a new connection is: a reader who moved one
       end heard the start and never the end. */
    if (linking.pointer === undefined) {
      this.said = fillTemplate(this.connectedLabel, {
        from: this.nameOf(detail.from),
        to: this.nameOf(detail.to),
      })
    }
    this.dispatchEvent(new HelixReconnectEvent(detail))
  }

  /**
   * Carries the selection and the tab stop from a connection's old key to its
   * new one.
   *
   * **A connection with no `name` is known by its two cards**, so moving an end
   * gives it a new key: the selection went on naming one that no longer
   * existed, so the connection just moved was selected and drawn as not, and
   * the tab stop pointed at nothing. A named connection keeps its key, and
   * nothing moves.
   */
  private rekey(was: string, now: string): void {
    if (was === now) {
      return
    }
    if (this.stop === was) {
      this.stop = now
    }
    const old = this.publicName(was)
    const names = this.selected
      .split(',')
      .map((one) => one.trim())
      .filter(Boolean)
    if (names.includes(old)) {
      this.selected = names.map((one) => (one === old ? this.publicName(now) : one)).join(',')
    }
  }

  /**
   * Asks for a card or a connection to go, and moves focus on once it has.
   *
   * A card takes every connection touching it, which would otherwise stop being
   * drawn and stay behind in the page's markup as an element joining nothing.
   */
  private requestRemove(keys: string | readonly string[]): void {
    const asked = typeof keys === 'string' ? [keys] : keys
    const walk = this.walk
    const edges = this.edges
    const nodes = asked.filter((one) => !one.startsWith('edge:'))
    const going = new Set(nodes)
    const leaving = edges.filter(
      (edge) =>
        asked.includes(this.keyOf(edge)) || going.has(edge.fromNode) || going.has(edge.toNode),
    )
    const detail = {
      edges: leaving.map((edge) => ({ from: edge.fromNode, name: edge.id, to: edge.toNode })),
      nodes,
    }
    const gone = new Set([...asked, ...leaving.map((edge) => this.keyOf(edge))])
    /* The next stop after the first one going that is not going too, or the
       one before where nothing after it is left. */
    const at = Math.min(...asked.map((one) => walk.findIndex((stop) => stop.key === one)))
    const next =
      walk.slice(at + 1).find((one) => !gone.has(one.key)) ??
      walk
        .slice(0, Math.max(at, 0))
        .reverse()
        .find((one) => !gone.has(one.key))
    this.refocus = { gone: [...gone], next: next?.key }
    this.dispatchEvent(new HelixRemoveEvent(detail))
  }

  /**
   * A click on a card or a connection: it alone, or with a modifier, added or
   * taken away.
   */
  private clicked(key: string, event: PointerEvent): void {
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      this.toggle(key)
      return
    }
    this.choose(key)
  }

  /**
   * The cards a box touches, by name, and the groups it holds whole.
   *
   * **A group only when the box takes all of it.** A box drawn to select the
   * cards inside a group starts and ends inside the group, and touching was
   * enough to select the group too, so a box could not select a group's cards
   * without its box coming along.
   */
  private within(box: { from: { x: number; y: number }; to: { x: number; y: number } }): string[] {
    const left = Math.min(box.from.x, box.to.x)
    const right = Math.max(box.from.x, box.to.x)
    const top = Math.min(box.from.y, box.to.y)
    const bottom = Math.max(box.from.y, box.to.y)
    const drawn = { height: bottom - top, width: right - left, x: left, y: top }
    return this.nodes
      .filter((one) =>
        one.type === 'group'
          ? inside(one, drawn)
          : one.x < right && one.x + one.width > left && one.y < bottom && one.y + one.height > top,
      )
      .map((one) => one.id)
  }

  /**
   * The line a connection is drawn along on the plane, and its middle, where
   * both its cards are on the board; nothing where either is not.
   */
  private geometryOf(
    edge: CanvasEdge,
    origin: { x: number; y: number },
  ): { d: string; mid: { x: number; y: number }; from: CanvasNode; to: CanvasNode } | undefined {
    const from = this.byId.get(edge.fromNode)
    const to = this.byId.get(edge.toNode)
    if (!from || !to) {
      return undefined
    }
    const drawn = connector(
      edge,
      onPlane(from, origin),
      onPlane(to, origin),
      edge.path ?? this.path ?? 'curve',
      heads(edge),
    )
    return { ...drawn, from, to }
  }

  /** The card an event came from, wherever inside it the event began. */
  private cardOf(event: Event): HelixHeadlessCanvasNode | undefined {
    return event
      .composedPath()
      .find((one): one is HelixHeadlessCanvasNode => one instanceof HelixHeadlessCanvasNode)
  }

  /**
   * The card and everything a move of it carries.
   *
   * A group carries every card inside its bounds, groups inside it included,
   * which is what the format means by a group and what every board does.
   */
  private carried(card: HelixHeadlessCanvasNode): HelixHeadlessCanvasNode[] {
    if (!card.group) {
      return [card]
    }
    const box = { height: card.height, width: card.width, x: card.x, y: card.y }
    return [
      card,
      ...this.cards.filter(
        (one) =>
          one !== card &&
          !one.readOnly &&
          inside({ height: one.height, width: one.width, x: one.x, y: one.y }, box),
      ),
    ]
  }

  /**
   * Everything a move of a card carries, and of every other selected card with
   * it where it is one of the selection: each card's group contents too, and
   * each card once however many ways it is reached.
   */
  private carriedAll(card: HelixHeadlessCanvasNode): HelixHeadlessCanvasNode[] {
    const picked = this.pickedCards
    const roots = picked.includes(card) ? picked.filter((one) => !this.fixed(one)) : [card]
    return [...new Set(roots.flatMap((one) => this.carried(one)))]
  }

  /**
   * The box a resize from a corner draws, held to a least size so a card
   * cannot be dragged inside out.
   */
  private resized(
    start: { x: number; y: number; width: number; height: number },
    corner: string,
    across: number,
    down: number,
  ): { x: number; y: number; width: number; height: number } {
    const left = corner.endsWith('left')
    const top = corner.startsWith('top')
    const width = Math.max(MIN_WIDTH, Math.round(start.width + (left ? -across : across)))
    const height = Math.max(MIN_HEIGHT, Math.round(start.height + (top ? -down : down)))
    return {
      height,
      width,
      x: left ? start.x + start.width - width : start.x,
      y: top ? start.y + start.height - height : start.y,
    }
  }

  /**
   * Whether a card is held where it is, by its own switch or the board's.
   *
   * A read-only card is not moved, connected from, connected to, or removed,
   * and a read-only board holds every card whatever each one says.
   */
  private fixed(card: HelixHeadlessCanvasNode | undefined): boolean {
    return this.readOnly || card === undefined || card.readOnly
  }

  /** The element behind a connection's key, for what only the element knows. */
  private edgeElement(key: string): HelixHeadlessCanvasEdge | undefined {
    if (this.keying) {
      return this.keying.byKey.get(key)
    }
    return this.edgeElements.find((child) => this.keyOfElement(child) === key)
  }

  /**
   * Every connection's key and every key's element, worked out once for the
   * render that asks for them.
   *
   * **One pass, where each asked alone walked them all.** A connection with no
   * `name` counts its twins to be told apart, and a render asks every
   * connection's element by key, so four hundred unnamed connections cost 53
   * ms a render and 4.7 seconds with them all chosen, every step of a drag.
   * Kept from `willUpdate` to `updated` only: outside a render a handler may
   * have just moved a connection's ends, and its key is worked out afresh.
   */
  private keying:
    | {
        byElement: Map<HelixHeadlessCanvasEdge, string>
        byKey: Map<string, HelixHeadlessCanvasEdge>
      }
    | undefined = undefined

  private keyAll(): {
    byElement: Map<HelixHeadlessCanvasEdge, string>
    byKey: Map<string, HelixHeadlessCanvasEdge>
  } {
    const byElement = new Map<HelixHeadlessCanvasEdge, string>()
    const byKey = new Map<string, HelixHeadlessCanvasEdge>()
    const twins = new Map<string, number>()
    for (const element of this.edgeElements) {
      const base = keyBase({ fromNode: element.from, id: element.name, toNode: element.to })
      let key = base
      if (!element.name) {
        const count = (twins.get(base) ?? 0) + 1
        twins.set(base, count)
        key = count > 1 ? `${base}#${count}` : base
      }
      byElement.set(element, key)
      if (!byKey.has(key)) {
        byKey.set(key, element)
      }
    }
    return { byElement, byKey }
  }

  /** The connections declared, in the order they were written. */
  private get edgeElements(): HelixHeadlessCanvasEdge[] {
    return this.knownChildren.filter(
      (child): child is HelixHeadlessCanvasEdge => child instanceof HelixHeadlessCanvasEdge,
    )
  }

  /**
   * What a connection is called in the walk and on the tab stop.
   *
   * Its element's id where it has one, and its two ends where it does not: a
   * page that writes edges without ids still gets one stop per connection.
   * **And a count where two share both ends**, the second `a->b#2`: under one
   * key the walk found the first every time and never reached the card after.
   */
  private keyOfElement(element: HelixHeadlessCanvasEdge): string {
    const known = this.keying?.byElement.get(element)
    if (known !== undefined) {
      return known
    }
    const base = keyBase({ fromNode: element.from, id: element.name, toNode: element.to })
    if (element.name) {
      return base
    }
    const twins = this.edgeElements.filter(
      (one) => !one.name && one.from === element.from && one.to === element.to,
    )
    const at = twins.indexOf(element)
    return at > 0 ? `${base}#${at + 1}` : base
  }

  /** The key of a connection as the board read it, which is its element's. */
  private keyOf(edge: CanvasEdge): string {
    return this.edgeKeys.get(edge) ?? keyBase(edge)
  }

  /** Each connection read, and the key of the element it was read from. */
  private edgeKeys = new WeakMap<CanvasEdge, string>()

  /** A stop's key as the name a page sees: a card's name, a connection's name or ends. */
  private publicName(key: string | undefined): string {
    return key === undefined ? '' : key.startsWith('edge:') ? key.slice(5) : key
  }

  /** The stop a public name means, where it means one. */
  private keyNamed(name: string): string | undefined {
    if (name === '') {
      return undefined
    }
    const stops = this.remember('stops', () => new Set(this.walk.map((one) => one.key)))
    return stops.has(name) ? name : stops.has(`edge:${name}`) ? `edge:${name}` : undefined
  }

  /** The selection, as the keys of the stops in it. */
  private get picked(): string[] {
    return this.remember('picked', () =>
      this.selected
        .split(',')
        .map((one) => this.keyNamed(one.trim()))
        .filter((one): one is string => one !== undefined),
    )
  }

  /**
   * Selects stops, or nothing, and says so: `helix-select`, which a page can
   * refuse, with the names as its value.
   */
  private choose(keys: string | readonly string[] | undefined): void {
    const list = keys === undefined ? [] : typeof keys === 'string' ? [keys] : [...new Set(keys)]
    const value = list.map((one) => this.publicName(one)).join(',')
    if (value === this.selected) {
      return
    }
    if (this.dispatchEvent(new HelixSelectEvent({ value }))) {
      this.selected = value
    }
  }

  /** Adds a stop to the selection, or takes it out where it was in. */
  private toggle(key: string): void {
    const picked = this.picked
    this.choose(picked.includes(key) ? picked.filter((one) => one !== key) : [...picked, key])
  }

  /** The cards in the selection. */
  private get pickedCards(): HelixHeadlessCanvasNode[] {
    const picked = new Set(this.picked)
    return this.cards.filter((one) => picked.has(one.name))
  }

  /** A card by name. */
  private cardNamed(name: string | undefined): HelixHeadlessCanvasNode | undefined {
    return name === undefined ? undefined : this.byName.get(name)
  }

  /**
   * Moves cards, having asked first.
   *
   * **The same contract as `open` on a dialog.** The request goes out before
   * anything moves; refused, nothing does, because the consumer is holding the
   * positions and will render them. Unrefused, the board writes them onto the
   * cards, which is the uncontrolled board a consumer gets by doing nothing.
   * Returns whether it applied, so a caller knows whether to report a finish.
   */
  private requestMove(detail: MoveDetail): boolean {
    if (!this.dispatchEvent(new HelixBeforeMoveEvent(detail))) {
      return false
    }
    for (const { height, name, width, x, y } of detail.nodes) {
      const card = this.byName.get(name)
      if (card) {
        card.x = x
        card.y = y
        if (width !== undefined && height !== undefined) {
          card.width = width
          card.height = height
        }
      }
    }
    this.requestUpdate()
    return true
  }

  /**
   * Drag to move the board, which is the gesture a canvas is reached for with.
   *
   * **Here rather than in the surface, because a map handles its own.** What
   * `Map` frames is somebody else's renderer, and MapLibre and Leaflet both
   * drag their own view: a frame that dragged too would move the map twice. A
   * board is drawn here, so the drag is this family's.
   *
   * The capture is an enhancement and the drag survives losing it, which is what
   * `capturePointer` is for: a pointer that leaves the box mid-drag keeps
   * moving the board rather than sticking.
   *
   * **Heard on the host rather than on the viewport**, and the cards are why.
   * A card is the consumer's element, slotted in, so what happens on one
   * reaches the host whatever else it passes on the way; a listener in the
   * shadow root depends on the event being routed through the slot, which a
   * browser does and a DOM implementation a consumer's tests run in need not.
   * So the host listens, and the path says what was pressed.
   */
  private readonly handlePointerDown = (event: PointerEvent): void => {
    /* **Nothing while a board with `gestures="activate"` waits**, and nothing
       on the press that ends the wait, which hands over the gestures. */
    if (!this.gestureAllowed(event)) {
      return
    }
    const path = event.composedPath()
    /* The primary button only, and never a press that began on a control: the
       buttons are inside this region and a press on one is not a drag. Nor one
       in the header or footer, which are the consumer's chrome. */
    const on = (name: string): boolean =>
      path.some(
        (one) =>
          one instanceof Element && (one.getAttribute('part') ?? '').split(' ').includes(name),
      )
    const card = this.cardOf(event)
    if (event.button !== 0 || on('controls') || !(card || on('viewport'))) {
      return
    }
    /* **A second finger pinches**, and never starts a gesture of its own: it
       took over the first finger's pan, which jumped the board to wherever
       the second finger landed. */
    if (event.pointerType === 'touch') {
      this.fingers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (this.fingers.size > 1) {
        if (this.fingers.size === 2 && !this.pinching) {
          this.startPinch()
        }
        return
      }
      /* **One finger is the page's on a cooperative board**, which scrolls
         past it; two pinch and move the board. */
      if (this.gestureMode === 'cooperative') {
        return
      }
    }
    /* **The press that puts down what a click picked up.** Wherever it lands
       is where the drag would have been let go, card, corner or line alike. */
    if (this.held) {
      /* And it moves nothing else: without this the press focused the card it
         landed on, which the board reads as a keyboard arriving there, and a
         connection put down by a click selected the card it arrived at. */
      event.preventDefault()
      this.putDown(event)
      return
    }
    if (path.some((one) => one instanceof Element && one.matches(INTERACTIVE))) {
      return
    }
    this.pressing = true
    const adding = event.shiftKey || event.metaKey || event.ctrlKey
    /* **A corner of a selected card resizes it**, captured at once, since a
       grip is only ever pressed to be dragged. */
    const grip = path.find(
      (one): one is Element => one instanceof Element && one.hasAttribute('data-corner'),
    )
    if (card && grip && !this.fixed(card)) {
      this.sizing = {
        card,
        corner: grip.getAttribute('data-corner') ?? 'bottom-right',
        from: { x: event.clientX, y: event.clientY },
        pointer: event.pointerId,
        start: { height: card.height, width: card.width, x: card.x, y: card.y },
      }
      capturePointer(this, event.pointerId)
      return
    }
    /* A press on a card or a connection selects it at once, so a drag that
       follows moves what was pressed; one already in a selection keeps the
       selection, so a drag moves all of it. A modifier leaves the choice to
       the release, which adds or takes away. */
    const pressed = this.edgeOf(event) ?? card?.name
    this.pointing = pressed !== undefined
    if (pressed !== undefined && !adding && !this.picked.includes(pressed)) {
      this.choose(pressed)
    }
    /* Shift and a drag across the empty board draws a box that selects. */
    if (!card && pressed === undefined && event.shiftKey) {
      const at = this.toDocument(event)
      this.marquee = { base: this.picked, from: at, pointer: event.pointerId, to: at }
      capturePointer(this, event.pointerId)
      return
    }
    /* **A press on the end of a selected connection picks that end up**, drag
       or click alike: it is only ever pressed to move the end. */
    const end = path.find(
      (one): one is Element => one instanceof Element && one.hasAttribute('data-end'),
    )
    const ended = end?.getAttribute('data-edge') ?? undefined
    if (end && ended !== undefined && !this.readOnly && !this.edgeElement(ended)?.readOnly) {
      this.startReconnect(ended, end.getAttribute('data-end') === 'from' ? 'from' : 'to', event)
      if (this.linking) {
        this.linking = { ...this.linking, origin: { x: event.clientX, y: event.clientY } }
      }
      capturePointer(this, event.pointerId)
      return
    }
    /* **A press on a connection picks up its nearer end**, once the hand has
       moved far enough to be a drag rather than a click that focuses it. */
    const pressedEdge = this.edgeOf(event)
    if (pressedEdge !== undefined && !this.readOnly && !this.edgeElement(pressedEdge)?.readOnly) {
      const edge = this.edges.find((one) => this.keyOf(one) === pressedEdge)
      const byId = new Map(this.nodes.map((one) => [one.id, one]))
      const from = edge ? byId.get(edge.fromNode) : undefined
      const to = edge ? byId.get(edge.toNode) : undefined
      if (edge && from && to) {
        const at = this.toDocument(event)
        const { end, start } = ends(edge, from, to)
        const moving =
          Math.hypot(at.x - start.x, at.y - start.y) < Math.hypot(at.x - end.x, at.y - end.y)
            ? 'from'
            : 'to'
        this.startReconnect(pressedEdge, moving, event)
        if (this.linking) {
          this.linking = { ...this.linking, pressed: { x: event.clientX, y: event.clientY } }
        }
        return
      }
    }
    /* A press on a card's handle draws a connection from that side. */
    const handle = path.find(
      (one): one is Element => one instanceof Element && one.hasAttribute('data-side'),
    )
    if (card && handle && !this.fixed(card)) {
      this.linking = {
        at: this.toDocument(event),
        from: card.name,
        origin: { x: event.clientX, y: event.clientY },
        pointer: event.pointerId,
        side: handle.getAttribute('data-side') as CanvasSide,
      }
      capturePointer(this, event.pointerId)
      return
    }
    /* **A press on a selected card's move handle carries it**, drag or click
       alike, since the handle is there for nothing else: a click on the card
       itself selects it, which is why moving without dragging needs one. */
    const mover = path.some((one) => one instanceof Element && one.hasAttribute('data-move'))
    if (card && mover && !this.fixed(card)) {
      this.carrying = {
        adding: false,
        cards: this.carriedAll(card).map((one) => ({ card: one, x: one.x, y: one.y })),
        from: { x: event.clientX, y: event.clientY },
        handle: true,
        pointer: event.pointerId,
        pressed: card.name,
        started: true,
      }
      capturePointer(this, event.pointerId)
      return
    }
    /* A press on a card carries the card, unless it is held, where it pans
       like a press anywhere else. */
    if (card && !this.fixed(card)) {
      this.carrying = {
        adding,
        cards: this.carriedAll(card).map((one) => ({ card: one, x: one.x, y: one.y })),
        from: { x: event.clientX, y: event.clientY },
        pointer: event.pointerId,
        pressed: card.name,
        started: false,
      }
      /* **Captured once it is a drag, not on the press.** A captured pointer's
         click and double-click are sent to the board rather than the card,
         so capturing on every press made a double-click on a card a
         double-click on nothing, and a card could not be opened to edit. */
      return
    }
    this.touched = true
    this.direct = true
    this.dragging = {
      at: { x: this.at.x, y: this.at.y },
      from: { x: event.clientX, y: event.clientY },
      pointer: event.pointerId,
      pressed,
    }
    capturePointer(this, event.pointerId)
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    this.idle.stir()
    if (this.fingers.has(event.pointerId)) {
      this.fingers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (this.pinching) {
        this.pinch()
        return
      }
    }
    /* **A mouse with no button down has let go**, whether or not the board
       heard it. A press on a card is not captured until it moves far enough
       to be a drag, so one flicked off the board and released outside it sent
       its release to nothing, and the card followed the mouse around from then
       on with no button held. */
    const pressed =
      this.carrying ?? this.dragging ?? this.sizing ?? this.marquee ?? this.linking?.pointer
    /* Not one a click picked up, which follows a mouse with no button down on
       purpose until the next click puts it down. */
    if (
      event.pointerType === 'mouse' &&
      event.buttons === 0 &&
      pressed !== undefined &&
      !this.held
    ) {
      this.handlePointerUp(new PointerEvent('pointercancel', { pointerId: event.pointerId }))
      return
    }
    const sizing = this.sizing
    if (sizing && (sizing.held || sizing.pointer === event.pointerId)) {
      const box = this.resized(
        sizing.start,
        sizing.corner,
        (event.clientX - sizing.from.x) / this.at.zoom,
        (event.clientY - sizing.from.y) / this.at.zoom,
      )
      const detail: MoveDetail = { nodes: [{ name: sizing.card.name, ...box }] }
      this.touched = true
      sizing.asked = true
      if (this.requestMove(detail)) {
        sizing.moved = detail
      }
      return
    }
    if (this.marquee?.pointer === event.pointerId) {
      this.marquee = { ...this.marquee, to: this.toDocument(event) }
      return
    }
    if (this.linking && (this.linking.held || this.linking.pointer === event.pointerId)) {
      const pressed = this.linking.pressed
      if (pressed && Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) < SLOP) {
        return
      }
      if (pressed) {
        capturePointer(this, event.pointerId)
      }
      const at = this.toDocument(event)
      const over = this.cardAt(at)
      const to = this.arrival(over?.id)
      this.linking = {
        ...this.linking,
        at,
        over: over?.id,
        pressed: undefined,
        to,
        toSide: to !== undefined && over ? sideNear(over, at) : undefined,
      }
      return
    }
    const carry = this.carrying
    if (carry && (carry.held || carry.pointer === event.pointerId)) {
      const across = event.clientX - carry.from.x
      const down = event.clientY - carry.from.y
      if (!carry.started && Math.hypot(across, down) < SLOP) {
        return
      }
      if (!carry.started) {
        capturePointer(this, event.pointerId)
      }
      carry.started = true
      this.touched = true
      /* The pointer moves in screen pixels and the card in the document's
         units, which differ by the zoom: unscaled, a card on a board zoomed
         out ran ahead of the hand that was holding it. */
      const detail: MoveDetail = {
        nodes: carry.cards.map(({ card, x, y }) => ({
          name: card.name,
          x: Math.round(x + across / this.at.zoom),
          y: Math.round(y + down / this.at.zoom),
        })),
      }
      carry.asked = true
      if (this.requestMove(detail)) {
        carry.moved = detail
      }
      return
    }
    const drag = this.dragging
    if (!drag || drag.pointer !== event.pointerId) {
      return
    }
    this.at = {
      ...this.at,
      x: drag.at.x + (event.clientX - drag.from.x),
      y: drag.at.y + (event.clientY - drag.from.y),
    }
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const finger = this.fingers.delete(event.pointerId)
    /* **A pinch ends when either finger lifts**, and the one left down moves
       nothing: carried on as a pan, the board jumped from under the finger
       by however far the pinch had moved the middle. */
    if (this.pinching) {
      if (this.fingers.size < 2) {
        this.pinching = undefined
        this.direct = false
      }
      if (this.fingers.size === 0) {
        this.pressing = false
      }
      return
    }
    /* A finger that landed while another was carrying something, and so
       did nothing, lets go of nothing. */
    const owner = [
      this.sizing?.pointer,
      this.marquee?.pointer,
      this.linking?.pointer,
      this.carrying?.pointer,
      this.dragging?.pointer,
    ].includes(event.pointerId)
    if (finger && !owner && this.fingers.size > 0) {
      return
    }
    this.pressing = false
    const pointing = this.pointing
    this.pointing = false
    const sizing = this.sizing
    if (sizing?.pointer === event.pointerId) {
      if (this.picksUp(sizing, event, sizing.from)) {
        this.sizing = { ...sizing, held: true }
        return
      }
      this.sizing = undefined
      if (sizing.moved) {
        this.dispatchEvent(new HelixMoveEvent(sizing.moved))
      }
      return
    }
    const marquee = this.marquee
    if (marquee?.pointer === event.pointerId) {
      this.marquee = undefined
      if (event.type !== 'pointercancel') {
        this.choose([...marquee.base, ...this.within(marquee)])
      }
      return
    }
    if (this.linking?.pointer === event.pointerId) {
      /* A press on a connection that never became a drag was a click, which
         selects it alone, or adds or takes it away with a modifier; nothing
         is picked up and nothing is asked for. */
      if (this.linking.pressed) {
        const clicked = this.linking.edge
        this.linking = undefined
        if (clicked !== undefined && pointing && event.type !== 'pointercancel') {
          this.clicked(clicked, event)
        }
        return
      }
      const origin = this.linking.origin
      if (origin && this.picksUp(this.linking, event, origin)) {
        this.linking = { ...this.linking, held: true }
        return
      }
      /* Where the preview said it would land, so what is asked for is what
         the reader was shown. A canceled pointer lands nowhere and asks
         nothing, even for a connection's end, which dropped on nothing would
         otherwise be a disconnect. */
      if (event.type === 'pointercancel') {
        this.linking = undefined
        this.said = ''
        return
      }
      this.finishLinking(this.linking.to ?? this.linking.over, this.linking.toSide)
      return
    }
    const carry = this.carrying
    if (carry?.pointer === event.pointerId) {
      if (carry.handle && this.picksUp(carry, event, carry.from)) {
        this.carrying = { ...carry, held: true }
        return
      }
      this.carrying = undefined
      /* A canceled press is not a click: on touch the browser cancels the
         pointer when it takes the gesture for a scroll or a zoom. */
      if (!carry.started && pointing && event.type !== 'pointercancel') {
        this.clicked(carry.pressed, event)
      }
      if (carry.moved) {
        this.dispatchEvent(new HelixMoveEvent(carry.moved))
      }
      return
    }
    if (this.dragging?.pointer === event.pointerId) {
      /* A press that never became a drag was a click: on the empty board,
         which selects nothing, or on a card or a connection that is held and
         so panned rather than moved, which selects it. Treating the second as
         the first cleared every selection a read-only board was given. */
      const drag = this.dragging
      if (
        event.type !== 'pointercancel' &&
        Math.hypot(event.clientX - drag.from.x, event.clientY - drag.from.y) < SLOP
      ) {
        if (drag.pressed !== undefined && pointing) {
          this.clicked(drag.pressed, event)
        } else {
          this.choose(undefined)
        }
      }
      this.dragging = undefined
      /* The hand is off it, so the next press glides again. Cleared here rather
         than left standing, or a board dragged once would never ease a press on
         the pad for the rest of the page's life. */
      this.direct = false
    }
  }

  /**
   * Whether a release picks up what its press took hold of, rather than
   * putting it down.
   *
   * **Moving without dragging, which WCAG 2.5.7 asks every drag to offer.** A
   * press on a corner, a handle, a connection's end or a card's move handle
   * that is let go where it was pressed is a click, and a click picks the thing
   * up: the box, the line or the card then follows the pointer with no button
   * held, and the next press puts it down wherever a drag let go there would
   * have. On touch, where nothing follows a finger that is not down, the next
   * tap is where it lands. Escape, or a press off the board, puts it back.
   *
   * Not while putting down, or the press that puts a thing down where it was
   * picked up would pick it up again.
   */
  private picksUp(
    gesture: { held?: boolean },
    event: PointerEvent,
    from: { x: number; y: number },
  ): boolean {
    if (gesture.held || this.putting || event.type === 'pointercancel') {
      return false
    }
    if (Math.hypot(event.clientX - from.x, event.clientY - from.y) >= SLOP) {
      return false
    }
    this.toggleState('holding', true)
    this.holding = true
    document.addEventListener('keydown', this.handleHeldKey, true)
    document.addEventListener('pointerdown', this.handleHeldOutside, true)
    return true
  }

  /** Whether something a click picked up is being carried to the next press. */
  private get held(): boolean {
    return Boolean(this.sizing?.held || this.linking?.held || this.carrying?.held)
  }

  /** Whether the document is being listened to for the end of a hold. */
  private holding = false

  /** Whether the press putting something down is being handled, which picks nothing up. */
  private putting = false

  /** When something was last put down, which a double click that follows is not. */
  private putAt = Number.NEGATIVE_INFINITY

  /**
   * Puts down what a click picked up, where this press is: the step a drag
   * would take to here, then its release.
   */
  private putDown(event: PointerEvent): void {
    const pointer = event.pointerId
    if (this.sizing) {
      this.sizing = { ...this.sizing, pointer }
    }
    if (this.linking) {
      this.linking = { ...this.linking, pointer }
    }
    if (this.carrying) {
      this.carrying = { ...this.carrying, pointer }
    }
    this.handlePointerMove(event)
    this.putting = true
    try {
      this.handlePointerUp(event)
    } finally {
      this.putting = false
    }
    this.putAt = event.timeStamp
    this.letGo()
  }

  /**
   * Puts back what a click picked up, as though it had never been.
   *
   * A card and a corner go back to where they started, asked for like any
   * move so a board whose page holds the positions is told; a line is dropped.
   * Nothing is announced as moved, because nothing did.
   */
  private putBack(): void {
    /* Asked back wherever a step was asked for, not only where one was
       applied: a page that holds the positions refuses every step and makes
       it itself, and is owed the request that undoes them. */
    const sizing = this.sizing
    if (sizing?.held) {
      this.sizing = undefined
      if (sizing.asked) {
        this.requestMove({ nodes: [{ name: sizing.card.name, ...sizing.start }] })
      }
    }
    const carry = this.carrying
    if (carry?.held) {
      this.carrying = undefined
      if (carry.asked) {
        this.requestMove({
          nodes: carry.cards.map(({ card, x, y }) => ({ name: card.name, x, y })),
        })
      }
    }
    if (this.linking?.held) {
      this.linking = undefined
      this.said = this.stoppedLabel
    }
    this.letGo()
  }

  /** Stops listening for the press or the key that ends a hold. */
  private letGo(): void {
    this.holding = false
    this.toggleState('holding', false)
    document.removeEventListener('keydown', this.handleHeldKey, true)
    document.removeEventListener('pointerdown', this.handleHeldOutside, true)
  }

  /* On the document while something is held, because nothing on the board
     need have focus: a click on a handle focuses nothing, and Escape has to
     reach the board all the same. */
  private readonly handleHeldKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.held) {
      event.preventDefault()
      event.stopPropagation()
      this.putBack()
    }
  }

  /** A press off the board while something is held, which puts it back. */
  private readonly handleHeldOutside = (event: PointerEvent): void => {
    if (this.held && !event.composedPath().includes(this)) {
      this.putBack()
    }
  }

  /**
   * A pinch, which zooms, and the wheel, which pans only once the board fills
   * the screen.
   *
   * **`ctrlKey` is a pinch as well as a control press**, which is the platform's
   * own convention rather than this component's: a trackpad pinch arrives as a
   * wheel event with `ctrlKey` set, on every browser, and a component that
   * ignored it would be the one thing on the page a pinch does not work on.
   *
   * **A plain wheel belongs to the page while the board is part of one.** Taking
   * it trapped the reader: a board is most of a screen tall, so scrolling down a
   * page stopped the moment the pointer crossed one and panned it instead, with
   * no way on but to move the pointer off it first. Measured on the examples
   * page, where the second board could not be scrolled to. A drag is how an
   * embedded board moves, which is the bargain an embedded map makes too; once
   * the reader has filled the screen with it there is no page left to scroll, so
   * the wheel is the board's.
   */
  private readonly handleWheel = (event: WheelEvent): void => {
    /* **⌘ as well as Ctrl**, which is the key a cooperative board's hint
       names on a Mac. A board with `gestures="always"` takes the plain wheel
       as a filled one does, and one waiting to be pressed takes none. */
    const zooming = event.ctrlKey || event.metaKey
    if (!this.gestureAllowed(event)) {
      return
    }
    if (!zooming && !this.filled && this.gestures !== 'always') {
      return
    }
    event.preventDefault()
    this.touched = true
    this.direct = true
    if (zooming) {
      /* **About the pointer, measured against the box rather than the target.**
         `offsetX` is relative to whatever the pointer is over, and over a board
         that is usually a card: a pinch on one scaled about a point a card's
         width from where the fingers were. The box is the listener, so the
         pointer less the box's corner is the point in it. */
      const box = (event.currentTarget as Element).getBoundingClientRect()
      const about = { x: event.clientX - box.left, y: event.clientY - box.top }
      this.zoomAbout(event.deltaY < 0 ? 1.1 : 1 / 1.1, about)
      return
    }
    this.at = { ...this.at, x: this.at.x - event.deltaX, y: this.at.y - event.deltaY }
  }

  /**
   * A second finger on a cooperative board, which would otherwise go on
   * scrolling the page the first finger started: stopped at the start, so
   * the two fingers pinch and move the board. **Not passive**, which is the
   * only way a start can be stopped.
   */
  private readonly handleTouchStart = (event: TouchEvent): void => {
    if (this.gestureMode === 'cooperative' && event.touches.length > 1) {
      event.preventDefault()
    }
  }

  /**
   * The keys on a card or a connection.
   *
   * **Only from the stop itself**, not from inside what a card holds: a card may
   * hold a link, a field or a chart that answers the arrows itself, and a press
   * taken from under one of those walked the board instead of the chart.
   *
   * **Arrows walk in reading order rather than in space.** The next card in the
   * order is the one a reader who cannot see the board needs, and the spatial
   * neighbor is a guess about where they think they are. Right and down go on,
   * left and up go back, Home and End go to the ends, and Escape goes back out
   * to the board, where the arrows pan it again.
   *
   * On a card, Shift with an arrow moves it, C starts a connection and Delete
   * asks for it to go. On a connection, Enter goes to the card it arrives at and
   * Delete asks for it to go. While a connection is being made, Enter on a card
   * asks for it and Escape stops.
   */
  private readonly handleStopKeydown = (event: KeyboardEvent): void => {
    const origin = event.composedPath()[0] as Element | undefined
    const edge = this.edgeOf(event)
    const card = edge === undefined ? this.cardOf(event) : undefined
    if (edge === undefined && (!card || origin?.getAttribute?.('part') !== 'node')) {
      return
    }
    const key = edge ?? (card as HelixHeadlessCanvasNode).name
    const along = inlineStep(this, event.key)
    const down = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
    /* **A letter or Delete with a modifier is someone else's.** Command or
       Control with C is Copy, and on a card it started a connection, on a
       connection a reconnect. Shift, Alt with the arrows, and Command or
       Control with A are this board's own, read below. */
    const plain = !event.metaKey && !event.ctrlKey && !event.altKey

    if (card && event.shiftKey && (along !== 0 || down !== 0)) {
      event.preventDefault()
      if (this.fixed(card)) {
        return
      }
      const detail: MoveDetail = {
        nodes: this.carriedAll(card).map((one) => ({
          name: one.name,
          x: one.x + along * NUDGE,
          y: one.y + down * NUDGE,
        })),
      }
      if (this.requestMove(detail)) {
        this.dispatchEvent(new HelixMoveEvent(detail))
      }
      void this.updateComplete.then(() => this.reveal(card.name))
      return
    }
    /* Alt with an arrow resizes the card from its bottom right, the keyboard's
       corner grip: right and down grow it, left and up shrink it. */
    if (card && event.altKey && (along !== 0 || down !== 0)) {
      event.preventDefault()
      if (this.fixed(card)) {
        return
      }
      const box = this.resized(
        { height: card.height, width: card.width, x: card.x, y: card.y },
        'bottom-right',
        along * NUDGE,
        down * NUDGE,
      )
      const detail: MoveDetail = { nodes: [{ name: card.name, ...box }] }
      if (this.requestMove(detail)) {
        this.dispatchEvent(new HelixMoveEvent(detail))
      }
      return
    }
    /* Space adds the stop to the selection or takes it away; Command or
       Control with A selects everything. */
    if (event.key === ' ' && !this.linking) {
      event.preventDefault()
      this.toggle(key)
      return
    }
    if ((event.metaKey || event.ctrlKey) && (event.key === 'a' || event.key === 'A')) {
      event.preventDefault()
      this.choose(this.walk.map((one) => one.key))
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      if (this.linking) {
        const back = this.linking.edge ?? this.linking.from
        this.linking = undefined
        this.said = this.stoppedLabel
        this.focusStop(back)
        return
      }
      this.choose(undefined)
      this.partNamed('region')?.focus()
      return
    }
    /* F2 edits a label the board draws, the platform's key for renaming; on
       a card, Enter does too, a card having no other use for it. */
    if (plain && !this.linking && (event.key === 'F2' || (card && event.key === 'Enter'))) {
      event.preventDefault()
      this.editStop(key)
      return
    }
    if (event.key === 'Enter') {
      if (card && this.linking) {
        event.preventDefault()
        this.finishLinking(card.name)
        return
      }
      if (edge !== undefined) {
        event.preventDefault()
        const to = this.edges.find((one) => this.keyOf(one) === edge)?.toNode
        this.focusStop(to)
      }
      return
    }
    if (
      plain &&
      card &&
      !this.fixed(card) &&
      !this.linking &&
      (event.key === 'c' || event.key === 'C')
    ) {
      event.preventDefault()
      this.startLinking(card.name)
      return
    }
    if (
      edge !== undefined &&
      !this.linking &&
      !this.readOnly &&
      !this.edgeElement(edge)?.readOnly &&
      plain &&
      (event.key === 'c' || event.key === 'C')
    ) {
      event.preventDefault()
      this.startReconnect(edge, 'to')
      return
    }
    /* Not while connecting: the card being connected from was sent for
       removal with its connections while the board still said it was
       connecting from it. */
    if (plain && !this.linking && (event.key === 'Delete' || event.key === 'Backspace')) {
      /* The whole selection where this is in it, less anything held. */
      const picked = this.picked
      const keys = picked.includes(key) ? picked : [key]
      const loose = keys.filter((one) =>
        one.startsWith('edge:')
          ? !this.readOnly && !this.edgeElement(one)?.readOnly
          : !this.fixed(this.cardNamed(one)),
      )
      if (loose.length > 0) {
        event.preventDefault()
        this.requestRemove(loose)
      }
      return
    }
    /* Walking while connecting stops on cards only: a connection is not
       somewhere a new one can arrive. */
    const walk = this.linking ? this.walk.filter((one) => one.kind === 'node') : this.walk
    /* From the card whose end stays, where the press is on the connection
       being moved, which is not in a walk of cards: from nowhere, the first
       arrow went to the first card on the board. */
    const found = walk.findIndex((one) => one.key === key)
    const at =
      found === -1 && this.linking ? walk.findIndex((one) => one.key === this.linking?.from) : found
    const to =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? walk.length - 1
          : along + down !== 0
            ? Math.min(Math.max(at + Math.sign(along + down), 0), walk.length - 1)
            : undefined
    if (to === undefined) {
      return
    }
    event.preventDefault()
    this.focusStop(walk[to]?.key)
  }

  /**
   * A stop a reader landed on becomes the tab stop, and a card comes into view.
   *
   * Into view rather than to the middle: a reader walking a row of cards that
   * are all on screen should see the focus ring move along it, not the board
   * lurch under every press.
   */
  private readonly handleFocusIn = (event: FocusEvent): void => {
    const edge = this.edgeOf(event)
    const card = edge === undefined ? this.cardOf(event) : undefined
    if (edge === undefined && !card) {
      return
    }
    this.refocus = undefined
    this.stop = edge ?? card?.name
    /* A keyboard landing selects what it lands on, keeping a selection it
       lands inside; a pointer's selection is its press's and its release's. */
    if (!this.pointing && this.stop !== undefined && !this.picked.includes(this.stop)) {
      this.choose(this.stop)
    }
    if (card) {
      /* A keyboard reader connecting arrives wherever they land, and the
         preview follows them there. */
      if (this.linking) {
        this.linking = { ...this.linking, to: this.arrival(card.name) }
      }
      /* **Brought into view for a keyboard, never under a press.** A card
         pressed at the edge of the view took focus and eased the board to
         center it, so the card slid from under the pointer, a drag that
         started there drifted away from the hand, and the board stopped
         fitting itself. */
      if (!this.pointing) {
        this.reveal(card.name)
      }
    }
  }

  /**
   * A connection being made from the keyboard ends when the reader leaves
   * the board, as Escape ends it.
   *
   * Otherwise the board went on showing every card as somewhere to land, and
   * a reader who came back and pressed Enter on a card connected something
   * they had long since walked away from. Only for somewhere else on the
   * page: a window losing focus names nothing, and the reader switching away
   * and back is still in the middle of it. A pointer's connection is its
   * own, ended by its release.
   */
  private readonly handleFocusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget
    const linking = this.linking
    if (
      !linking ||
      linking.pointer !== undefined ||
      linking.held ||
      !(next instanceof Node) ||
      this.contains(next) ||
      this.renderRoot.contains(next)
    ) {
      return
    }
    this.linking = undefined
    this.said = this.stoppedLabel
  }

  /** Brings a card into view, where it is not already whole in it. */
  private reveal(id: string): void {
    const node = this.byId.get(id)
    const origin = this.origin
    if (!node || !origin) {
      return
    }
    const free = this.free
    const left = this.at.x + (node.x - origin.x) * this.at.zoom
    const top = this.at.y + (node.y - origin.y) * this.at.zoom
    const seen =
      left >= free.x &&
      top >= free.y &&
      left + node.width * this.at.zoom <= free.x + free.width &&
      top + node.height * this.at.zoom <= free.y + free.height
    if (!seen) {
      this.show(id)
    }
  }

  /**
   * Edits a stop: a connection's label or a group's name in place, which the
   * board draws; a card's content by asking, which the board does not.
   */
  private editStop(key: string): void {
    if (this.readOnly) {
      return
    }
    if (key.startsWith('edge:')) {
      const edge = this.edgeElement(key)
      if (edge && !edge.readOnly) {
        this.editing = { key, target: 'edge', was: edge.label ?? '' }
      }
      return
    }
    const card = this.cardNamed(key)
    if (!card || this.fixed(card)) {
      return
    }
    if (card.group) {
      this.editing = { key, target: 'group', was: card.label }
      return
    }
    this.dispatchEvent(new HelixCanvasEditEvent({ name: card.name }))
  }

  /** A double-click on a card or a connection edits it, the pointer's F2. */
  private readonly handleDoubleClick = (event: MouseEvent): void => {
    const path = event.composedPath()
    if (path.some((one) => one instanceof Element && one.matches(INTERACTIVE))) {
      return
    }
    /* Not the click that picked something up and the one that put it down,
       which land close enough together to read as a double click on a card. */
    if (this.held || event.timeStamp - this.putAt < 500) {
      return
    }
    const edge = this.edgeOf(event)
    const key = edge ?? this.cardOf(event)?.name
    if (key !== undefined) {
      event.preventDefault()
      this.editStop(key)
    }
  }

  /**
   * Finishes editing a label: asks, writes it where the page did not refuse,
   * and says it did. The same value is no change and asks nothing.
   */
  private finishEditing(field: HTMLInputElement | undefined, keep: boolean): void {
    const editing = this.editing
    if (!editing) {
      return
    }
    this.editing = undefined
    const label = (field?.value ?? '').trim()
    const back = (): void => {
      void this.updateComplete.then(() => this.focusStop(editing.key))
    }
    if (!keep || label === editing.was) {
      back()
      return
    }
    const edge = editing.target === 'edge' ? this.edgeElement(editing.key) : undefined
    const card = editing.target === 'group' ? this.cardNamed(editing.key) : undefined
    const detail: RelabelDetail = {
      label,
      name: edge ? edge.name : (card?.name ?? ''),
      target: editing.target,
      was: editing.was,
      ...(edge ? { from: edge.from, to: edge.to } : {}),
    }
    if (this.dispatchEvent(new HelixBeforeRelabelEvent(detail))) {
      if (edge) {
        edge.label = label || undefined
      } else if (card) {
        card.label = label
      }
      this.dispatchEvent(new HelixRelabelEvent(detail))
    }
    back()
  }

  /**
   * The keys in a label being edited, which are the field's: Enter keeps,
   * Escape puts it back, and nothing reaches the board, whose arrows would
   * otherwise pan it out from under the caret.
   */
  private readonly handleEditorKeydown = (event: KeyboardEvent): void => {
    event.stopPropagation()
    if (event.key === 'Enter' || event.key === 'Escape') {
      event.preventDefault()
      this.finishEditing(event.currentTarget as HTMLInputElement, event.key === 'Enter')
    }
  }

  private readonly handleEditorBlur = (event: FocusEvent): void => {
    this.finishEditing(event.currentTarget as HTMLInputElement, true)
  }

  /** The field a label is edited in, where the label is, while one is. */
  private renderEditor(origin: { x: number; y: number }) {
    const editing = this.editing
    if (!editing) {
      return nothing
    }
    let at: { x: number; y: number } | undefined
    let named = ''
    if (editing.target === 'edge') {
      const edge = this.edges.find((one) => this.keyOf(one) === editing.key)
      const drawn = edge ? this.geometryOf(edge, origin) : undefined
      if (drawn) {
        at = drawn.mid
        named = fillTemplate(this.connectionLabel, {
          from: this.textOf(drawn.from),
          to: this.textOf(drawn.to),
        })
      }
    } else {
      const group = this.byId.get(editing.key)
      if (group) {
        at = { x: group.x - origin.x, y: group.y - origin.y }
        named = this.textOf(group)
      }
    }
    if (!at) {
      return nothing
    }
    return html`<input
      part="label-editor"
      aria-label=${fillTemplate(this.labelEditorLabel, { name: named })}
      data-target=${editing.target}
      style=${`--_canvas-editor-x: ${at.x}px; --_canvas-editor-y: ${at.y}px`}
      type="text"
      .value=${editing.was}
      @blur=${this.handleEditorBlur}
      @keydown=${this.handleEditorKeydown}
    />`
  }

  /** The box a Shift-drag is drawing, on the plane, while it is. */
  private renderMarquee(origin: { x: number; y: number }) {
    const box = this.marquee
    if (!box) {
      return nothing
    }
    const left = Math.min(box.from.x, box.to.x) - origin.x
    const top = Math.min(box.from.y, box.to.y) - origin.y
    return html`<div
      part="marquee"
      aria-hidden="true"
      style=${`--_canvas-marquee-x: ${left}px; --_canvas-marquee-y: ${top}px; --_canvas-marquee-inline-size: ${Math.abs(box.to.x - box.from.x)}px; --_canvas-marquee-block-size: ${Math.abs(box.to.y - box.from.y)}px`}
    ></div>`
  }

  /**
   * The fingers' spread and the point between them, in the box. Taken from
   * the first two fingers down, where a third has landed as well.
   */
  private fingerSpan(): { middle: { x: number; y: number }; spread: number } {
    const [one, two] = [...this.fingers.values()] as [
      { x: number; y: number },
      { x: number; y: number },
    ]
    const box = this.partNamed('viewport')?.getBoundingClientRect()
    return {
      middle: {
        x: (one.x + two.x) / 2 - (box?.left ?? 0),
        y: (one.y + two.y) / 2 - (box?.top ?? 0),
      },
      spread: Math.hypot(two.x - one.x, two.y - one.y),
    }
  }

  /**
   * Turns what the first finger was doing into a pinch, where that was a pan
   * or a press that had not yet moved anything. A finger already carrying a
   * card, drawing a line, resizing or drawing a box goes on doing that.
   */
  private startPinch(): void {
    if (this.sizing || this.marquee || this.linking || this.held || this.carrying?.started) {
      return
    }
    this.carrying = undefined
    this.dragging = undefined
    this.pointing = false
    const { middle, spread } = this.fingerSpan()
    if (spread === 0) {
      return
    }
    for (const pointer of this.fingers.keys()) {
      capturePointer(this, pointer)
    }
    this.touched = true
    this.direct = true
    this.pinching = { at: { ...this.at }, middle, spread }
  }

  /**
   * Scales the board by how far the fingers have spread since the pinch
   * began, about the point between them, and carries it with that point, so
   * what was under the fingers stays under them.
   */
  private pinch(): void {
    const start = this.pinching
    if (!start) {
      return
    }
    const { middle, spread } = this.fingerSpan()
    const zoom = Math.min(Math.max((start.at.zoom * spread) / start.spread, ZOOM_MIN), ZOOM_MAX)
    this.at = {
      x: middle.x - ((start.middle.x - start.at.x) * zoom) / start.at.zoom,
      y: middle.y - ((start.middle.y - start.at.y) * zoom) / start.at.zoom,
      zoom,
    }
  }

  /** Scales about a point in the box, which is what both the buttons and a pinch want. */
  private zoomAbout(by: number, about: { x: number; y: number }): void {
    const from = this.at.zoom
    const to = Math.min(Math.max(from * by, ZOOM_MIN), ZOOM_MAX)
    this.at = {
      x: about.x - ((about.x - this.at.x) * to) / from,
      y: about.y - ((about.y - this.at.y) * to) / from,
      zoom: to,
    }
  }

  /** What one card says in the reading list, its links included. */
  private linksOf(node: CanvasNode): string {
    return this.remember('links', () => this.readLinks()).get(node.id) ?? ''
  }

  /**
   * Every card's sentence at once: one pass over the connections, and one
   * list formatter, rather than both again for every card.
   */
  private readLinks(): Map<string, string> {
    const named = (id: string): string => {
      const other = this.byId.get(id)
      return other ? this.textOf(other) : id
    }
    const leads = new Map<string, string[]>()
    const from = new Map<string, string[]>()
    for (const edge of this.edges) {
      leads.set(edge.fromNode, [...(leads.get(edge.fromNode) ?? []), named(edge.toNode)])
      from.set(edge.toNode, [...(from.get(edge.toNode) ?? []), named(edge.fromNode)])
    }
    const lang = this.closest('[lang]')?.getAttribute('lang') || undefined
    const list = new Intl.ListFormat(lang, { type: 'conjunction' })
    return new Map(
      this.nodes.map((one) => {
        const out = leads.get(one.id) ?? []
        const into = from.get(one.id) ?? []
        return [
          one.id,
          [
            out.length > 0 ? fillTemplate(this.leadsToLabel, { cards: list.format(out) }) : '',
            into.length > 0 ? fillTemplate(this.comesFromLabel, { cards: list.format(into) }) : '',
          ]
            .filter(Boolean)
            .join('; '),
        ]
      }),
    )
  }

  /** What a node is called, whichever kind it is. */
  private textOf(node: CanvasNode): string {
    return node.label ?? node.text ?? node.file ?? node.url ?? node.id
  }

  /**
   * The part of the box a fit may use, which is the box less the controls.
   *
   * **The controls are chrome, not free space.** They float over the board in
   * a corner, and a fit that used the whole box put the nearest card under
   * them: the opening view of a board hid part of the board behind the buttons
   * that move it. A map can let its controls sit over the tiles because a map
   * is continuous; a card is not, and one half-covered reads as a broken layout.
   *
   * **A band or a column, whichever costs less.** The cluster sits in a corner,
   * so keeping the board clear of it takes either a band across the edge it sits
   * on or a column down the side it sits on, and either alone is enough. The
   * cheaper wins, measured rather than guessed from the shape: a wide short box
   * loses less to a column and a tall narrow one less to a band. Never more than
   * half the box, or a small frame would fit its board into nothing.
   *
   * Measured rather than computed from `controls` and `controls-placement`, so
   * a consumer who restyles the cluster, moves it with a part rule, or hides it
   * with `controls="none"` gets a fit that follows what is actually there.
   */
  private get free(): { x: number; y: number; width: number; height: number } {
    const { height, width } = this.box
    const whole = { height, width, x: 0, y: 0 }
    const viewport = this.renderRoot?.querySelector('[part="viewport"]')
    const controls = this.controlsElement
    if (!viewport || !controls) {
      return whole
    }
    const box = viewport.getBoundingClientRect()
    const cluster = controls.getBoundingClientRect()
    if (cluster.width === 0 || cluster.height === 0) {
      return whole
    }
    const atTop = cluster.top - box.top <= box.bottom - cluster.bottom
    const atLeft = cluster.left - box.left <= box.right - cluster.right
    /* From the near edge to the far side of the cluster, plus the same gap
       again, so a card clears the buttons by what they clear the frame by. */
    const band = atTop
      ? cluster.bottom - box.top + (cluster.top - box.top)
      : box.bottom - cluster.top + (box.bottom - cluster.bottom)
    const column = atLeft
      ? cluster.right - box.left + (cluster.left - box.left)
      : box.right - cluster.left + (box.right - cluster.right)
    if (band / height <= column / width && band <= height / 2) {
      return { height: height - band, width, x: 0, y: atTop ? band : 0 }
    }
    if (column <= width / 2) {
      return { height, width: width - column, x: atLeft ? column : 0, y: 0 }
    }
    return whole
  }

  /**
   * The board's current view: the document's point at the middle of the view,
   * and the zoom.
   *
   * **Read to save a view and written to restore one**, which a consumer keeping
   * a minimap in step, or putting a reader back where they were, had no way to
   * do: where the board sat was private, and the events said only which way a
   * control had moved it. The middle rather than a corner, so a view saved in
   * one box shows the same thing in the middle of a box of another size.
   * Writing one counts as the reader choosing a view, so a later resize keeps
   * it rather than fitting the board again.
   */
  get view(): CanvasView {
    if (this.waiting) {
      return this.waiting
    }
    const origin = this.origin ?? { x: 0, y: 0 }
    const { height, width } = this.box
    return {
      x: origin.x + (width / 2 - this.at.x) / this.at.zoom,
      y: origin.y + (height / 2 - this.at.y) / this.at.zoom,
      zoom: this.at.zoom,
    }
  }

  set view(next: CanvasView) {
    /* A number is a view and anything else is not: `NaN` was written into
       every transform the board draws with. */
    if (![next.x, next.y, next.zoom].every(Number.isFinite)) {
      return
    }
    this.touched = true
    /* **Held until the board has drawn**, and so knows where its corner is and
       how big its view is. Restoring a saved view as the board is made, which
       is what this is for, was measured against neither, and landed off by
       the distance between them: `{ x: 600, y: 450 }` came back as
       `{ x: 1068, y: 818 }`. */
    if (!this.hasUpdated || !this.origin) {
      this.waiting = next
      return
    }
    this.waiting = undefined
    const { height, width } = this.box
    const origin = this.origin
    const zoom = Math.min(Math.max(next.zoom, ZOOM_MIN), ZOOM_MAX)
    this.direct = false
    this.at = {
      x: width / 2 - (next.x - origin.x) * zoom,
      y: height / 2 - (next.y - origin.y) * zoom,
      zoom,
    }
  }

  /** A view written before the board could place it, placed once it can. */
  private waiting: CanvasView | undefined = undefined

  /** The view last reported, so a render that did not move the board says nothing. */
  private reported?: CanvasView

  /**
   * The board as a JSON Canvas document, for saving it.
   *
   * What each card holds is the consumer's DOM, so a card comes back as a card
   * of text holding what it says; a file or a link the consumer drew inside one
   * is theirs to write back, which `fromJsonCanvas` handed them on the way in.
   */
  toJsonCanvas(): CanvasDocument {
    /* **Every edge gets an id**, which the format requires and makes unique,
       and which a connection declared without a `name` does not have. The
       cards it joins, counted where two join the same pair. Copies, so a
       consumer editing what came back is not editing what the board draws. */
    const taken = new Set(this.edges.map((edge) => edge.id).filter(Boolean))
    const edges = this.edges.map((read) => {
      /* **The sides as written**, and none where none was. The board reads
         each connection with the sides it worked out, so an export named
         them all, and a board saved and loaded again had every connection
         pinned to sides that no longer turned toward a moved card. */
      const { fromSide: _from, toSide: _to, ...rest } = read
      const key = this.keyOf(read)
      const element = this.edgeElement(key)
      const edge: CanvasEdge = {
        ...rest,
        ...(element?.fromSide ? { fromSide: element.fromSide } : {}),
        ...(element?.toSide ? { toSide: element.toSide } : {}),
      }
      if (edge.id) {
        return edge
      }
      /* The name the page already knows it by, from the selection. */
      const base = this.publicName(key)
      let id = base
      for (let count = 2; taken.has(id); count++) {
        id = `${base}-${count}`
      }
      taken.add(id)
      return { ...edge, id }
    })
    return { edges, nodes: this.nodes.map((node) => ({ ...node })) }
  }

  /**
   * Fits the whole board into its box, centered, and never zoomed in past its
   * own size.
   *
   * **Automatic while nobody has touched the board, and public for when they
   * have.** The document carries every rectangle, so the extent is arithmetic
   * rather than a guess, and a board that opened cropped would be one a reader
   * has to go looking for. Never magnified past its own size: a four-card board
   * blown up to fill a screen is a worse first view than a small one in the
   * middle.
   */
  fit(): void {
    this.fitInto(false)
  }

  /**
   * The fit, gliding or landing.
   *
   * **A fit the board makes for itself lands; one a consumer asks for glides.**
   * The automatic fit runs as the page loads and whenever the box resizes, and
   * easing it made the board visibly drift into place after everything else had
   * settled, and trail a container being resized by a fraction of a second.
   * It also left Chrome's screenshot of the SVG labels rastered at the scale the
   * glide started from, which is how it was found: the two twins of an example
   * matched to the attribute and differed on every label. A consumer's own
   * `fit()` is a press on a button of theirs, and glides like the pad.
   */
  private fitInto(direct: boolean): void {
    const board = extent(this.nodes)
    const free = this.free
    if (board.width === 0 || free.width === 0 || free.height === 0) {
      return
    }
    const whole = { height: board.height + MARGIN * 2, width: board.width + MARGIN * 2 }
    const zoom = Math.min(1, free.width / whole.width, free.height / whole.height)
    if (!Number.isFinite(zoom) || zoom <= 0) {
      return
    }
    const next = {
      x: free.x + (free.width - whole.width * zoom) / 2,
      y: free.y + (free.height - whole.height * zoom) / 2,
      zoom,
    }
    /* **Only where it moved**, or this never stops. A fit runs after every
       render and assigning a fresh object is a change whatever is in it, so an
       unconditional write re-renders, fits, writes, and the page never finishes
       loading. Measured as a hung example rather than a slow one. */
    if (next.x === this.at.x && next.y === this.at.y && next.zoom === this.at.zoom) {
      return
    }
    this.direct = direct
    this.at = next
  }

  /**
   * Asks for the render a hydration put off, so the cards get read.
   *
   * The mixin starts the idle wait here, and this adds the half a board needs:
   * the update that hydrated the server's markup could not look at the children,
   * so the one after it does.
   */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
    if (this.waiting) {
      /* The box as it is now, so the first resize after this keeps the view's
         middle: the viewport settles its height after the first render, and
         a view placed before it moved by half of what it gained. */
      this.measured = this.box
      this.view = this.waiting
    }
  }

  /** A card added or taken away is a board of a different size. */
  private readonly handleSlotChange = (): void => {
    this.requestUpdate()
  }

  protected override updated(changed: PropertyValues): void {
    this.keying = undefined
    super.updated(changed)
    this.assign()
    /* A connection is drawn after the card it leaves, so a render that moves
       that card in the walk draws it in another layer, and the target that
       had focus is gone or is another connection's. Focus goes back to it. */
    const edge = this.focusedEdge
    this.focusedEdge = undefined
    if (edge && (!edge.target.isConnected || edge.target.getAttribute('data-edge') !== edge.key)) {
      this.focusStop(edge.key)
    }
    /* A hold that ended some other way than being put down or put back, a
       connection finished with Enter, still stops listening for its end. */
    if (this.holding && !this.held) {
      this.letGo()
    }
    /* A field just opened takes the caret with what it says selected, so
       typing replaces it and an arrow key keeps it. */
    if (changed.has('editing') && this.editing) {
      const field = this.partNamed<HTMLInputElement>('label-editor')
      field?.focus()
      field?.select()
    }
    this.place({ x: extent(this.nodes).x - MARGIN, y: extent(this.nodes).y - MARGIN })
    /* Said once per change of view, whatever changed it, and not for a render
       that left it where it was. */
    const view = this.view
    const was = this.reported
    if (!was || was.x !== view.x || was.y !== view.y || was.zoom !== view.zoom) {
      this.reported = view
      if (was) {
        this.dispatchEvent(new HelixCanvasViewEvent(view))
      }
    }
    /* Once what was removed has gone, focus goes on to what was next. */
    const refocus = this.refocus
    if (refocus) {
      const keys = new Set(this.walk.map((one) => one.key))
      if (refocus.gone.every((one) => !keys.has(one))) {
        this.refocus = undefined
        this.focusStop(
          refocus.next !== undefined && keys.has(refocus.next) ? refocus.next : this.walk[0]?.key,
        )
      }
    }
    this.watchBox()
    if (!this.touched) {
      this.fitInto(true)
    }
  }

  /**
   * Watches the cards' words and the colors written onto the elements.
   *
   * A `style` change redraws only where the color it carries moved, because
   * the board writes each card's place into the same attribute on every
   * render, and answering that would be a render asking for the next one.
   */
  private watchWords(): void {
    if (typeof MutationObserver === 'undefined') {
      return
    }
    this.words ??= new MutationObserver((records) => {
      /* Each element once, however many of its style writes are in the batch. */
      const seen = new Set<Node>()
      const heard = records.filter((record) => {
        if (record.type !== 'attributes') {
          return true
        }
        if (seen.has(record.target)) {
          return false
        }
        seen.add(record.target)
        return true
      })
      if (heard.some((record) => this.redraws(record))) {
        this.requestUpdate()
      }
    })
    this.words.observe(this, {
      attributeFilter: ['style'],
      characterData: true,
      childList: true,
      subtree: true,
    })
  }

  private redraws(record: MutationRecord): boolean {
    if (record.type !== 'attributes') {
      return true
    }
    const target = record.target
    const name =
      target instanceof HelixHeadlessCanvasNode
        ? '--canvas-node-color'
        : target instanceof HelixHeadlessCanvasEdge
          ? '--canvas-edge-color'
          : undefined
    return (
      name !== undefined &&
      custom(target as HTMLElement, name) !== (this.painted.get(target as Element) ?? '')
    )
  }

  /**
   * Keeps one observer on the box, so a fit follows a resize that has not
   * happened yet.
   *
   * **Observed once, not on every render**, which is what threw "ResizeObserver
   * loop completed with undelivered notifications" in every example that
   * resized. A resize fits the board, the fit renders, and the render ran inside
   * the browser's pass over the observers: re-observing there queues a first
   * notification for the viewport at a depth the pass has already delivered,
   * so the browser gives up on it and says so. The viewport is the same element
   * from the first render on, so there is nothing to re-observe.
   */
  private watchBox(): void {
    const viewport = this.renderRoot?.querySelector('[part="viewport"]')
    if (typeof ResizeObserver === 'undefined' || !viewport || viewport === this.watched) {
      return
    }
    this.watched = viewport
    this.sizes ??= new ResizeObserver(() => {
      const box = this.box
      const was = this.measured
      this.measured = box
      if (!this.touched) {
        this.fitInto(true)
        return
      }
      /* **A reader who has chosen a view keeps its middle.** Filling the screen
         is the common resize, and the board sat at the corner it had been
         pinned to while the frame grew away from it down and to the right.
         Moving by half of what the box gained holds the point in the middle
         of the view in the middle. */
      if (was && (was.width !== box.width || was.height !== box.height)) {
        this.direct = true
        this.at = {
          ...this.at,
          x: this.at.x + (box.width - was.width) / 2,
          y: this.at.y + (box.height - was.height) / 2,
        }
      }
    })
    this.sizes.disconnect()
    this.sizes.observe(viewport)
  }

  /**
   * Watches again after a move, which a disconnect would otherwise end.
   *
   * A reorder is a disconnect and a connect with no render between them, so an
   * observer torn down on the way out and rebuilt only on the next update is one
   * that watches nothing until something else happens to change.
   */
  override connectedCallback(): void {
    super.connectedCallback()
    this.watchBox()
    this.watchWords()
    this.addEventListener('dblclick', this.handleDoubleClick)
    this.addEventListener('focusin', this.handleFocusIn)
    this.addEventListener('focusout', this.handleFocusOut)
    this.addEventListener('keydown', this.handleStopKeydown)
    this.addEventListener('pointercancel', this.handlePointerUp)
    this.addEventListener('pointerdown', this.handlePointerDown)
    this.addEventListener('pointermove', this.handlePointerMove)
    this.addEventListener('pointerup', this.handlePointerUp)
    this.addEventListener('touchstart', this.handleTouchStart, { passive: false })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    /* What a click picked up is put back, and the document stops being
       listened to on its behalf. */
    if (this.held) {
      this.putBack()
    }
    this.sizes?.disconnect()
    this.watched = undefined
    this.words?.disconnect()
    this.removeEventListener('dblclick', this.handleDoubleClick)
    this.removeEventListener('focusin', this.handleFocusIn)
    this.removeEventListener('focusout', this.handleFocusOut)
    this.removeEventListener('keydown', this.handleStopKeydown)
    this.removeEventListener('pointercancel', this.handlePointerUp)
    this.removeEventListener('pointerdown', this.handlePointerDown)
    this.removeEventListener('pointermove', this.handlePointerMove)
    this.removeEventListener('pointerup', this.handlePointerUp)
    this.removeEventListener('touchstart', this.handleTouchStart)
  }

  protected override willUpdate(changed: PropertyValues): void {
    this.keying = this.keyAll()
    super.willUpdate(changed)
    /* Asked of the shadow root only while focus is in it, which the document
       reports as the host: a card holding focus is the page's own element. */
    const focused =
      this.ownerDocument?.activeElement === this
        ? (this.renderRoot as ShadowRoot).activeElement
        : undefined
    const key = focused?.getAttribute?.('data-edge')
    this.focusedEdge = focused && key ? { key, target: focused } : undefined
    const drawn = extent(this.nodes)
    const origin = { x: drawn.x - MARGIN, y: drawn.y - MARGIN }
    /* Held where the plane's corner moved, so the cards stay where they are on
       screen. Assigned here, before the render, so it costs no second one. */
    if (this.origin && (origin.x !== this.origin.x || origin.y !== this.origin.y)) {
      this.at = {
        ...this.at,
        x: this.at.x + (origin.x - this.origin.x) * this.at.zoom,
        y: this.at.y + (origin.y - this.origin.y) * this.at.zoom,
      }
    }
    this.origin = origin
    hostAria(this.internals, { label: this.label })
    this.toggleState('connecting', this.drawing)
    this.toggleState('direct', this.direct)
    this.toggleState('pressing', this.pressing)
    this.toggleState('empty', this.nodes.length === 0)
    this.toggleState('fullscreen', this.filled)
    this.toggleState('idle', this.resting)
  }

  /**
   * Places the cards, which is writing onto elements somebody else wrote.
   *
   * **The board positions its children rather than drawing them**, the way
   * `Tabs` marks its panels: the card is the consumer's element, holding the
   * consumer's DOM, and what this knows that they do not is where the extent
   * starts and therefore what their coordinates come to on this plane. Written
   * as custom properties so the styled tier decides what placement looks like.
   */
  private place(origin: { x: number; y: number }): void {
    const all = this.nodes
    /* What a box being drawn would select shows as selected while it is. */
    const picked = new Set([...this.picked, ...(this.marquee ? this.within(this.marquee) : [])])
    const alone = this.picked.length === 1 ? this.picked[0] : undefined
    /* The first card in reading order until a reader has landed on one, and
       again if the one they were on is taken away. */
    const stop =
      this.stop !== undefined && this.keyNamed(this.stop) === this.stop
        ? this.stop
        : reading(all, this.edges, this.order ?? 'spatial')[0]?.id
    for (const card of this.cards) {
      /* Written only where it moved: a drag of three cards on a board of
         eight hundred rewrote every card's place on every step. **Into the
         card's own shadow root**, since its `style` is the page's: there a
         place was markup the server never sent, and a page that set a card's
         color wiped it. */
      const x = finite(card.x) - origin.x
      const y = finite(card.y) - origin.y
      const placed = `${x} ${y} ${finite(card.width)} ${finite(card.height)}`
      if (this.placed.get(card) !== placed) {
        this.placed.set(card, placed)
        /* A card with no size of its own is as large as what it says, the
           sheet's own default, rather than a zero box hiding its words. */
        card.place({
          '--_canvas-card-block-size': size(finite(card.height)),
          '--_canvas-card-inline-size': size(finite(card.width)),
          '--_canvas-card-x': `${x}px`,
          '--_canvas-card-y': `${y}px`,
        })
      }
      /* **No `data-group` written onto the card**, which it was, for nothing
         to read: an attribute on the page's own markup the server never sent,
         which React's hydration reports on every card in a group. */
      const node = this.byId.get(card.name)
      card.links = node ? this.linksOf(node) : ''
      card.meaning = card.tone ? (this.toneLabels[card.tone] ?? '') : ''
      card.current = card.name === stop
      card.selected = picked.has(card.name)
      card.resizable = alone === card.name && !this.fixed(card)
      card.movable = picked.has(card.name) && !this.fixed(card)
      card.connectable = !this.fixed(card)
      /* While a connection is being drawn, every card it could arrive at says
         so and the one under the pointer says it most: a line dragged across a
         board of cards that looked the same everywhere gave no way to tell
         where letting go would land. */
      card.candidate = this.drawing && this.arrival(card.name) !== undefined
      card.target = this.linking?.to === card.name
    }
  }

  /**
   * The two ends of each selected connection, which a press picks up.
   *
   * **The pointer's way to move an end without dragging**: a click on one
   * picks it up and the next puts it down, where pressing the line and
   * dragging picks up the nearer end as before. Only on a connection the
   * reader selected, so a board is not dotted with them, and never on one the
   * board or the connection holds. Hidden from assistive technology, which
   * moves an end with the keyboard.
   *
   * **Over the cards, not with the lines.** An end sits exactly on the point
   * of the card it arrives at, and the cards are drawn over the lines, so an
   * end drawn with them was always under that point: a click on it drew a new
   * connection from the card instead.
   */
  private renderEnds(origin: { x: number; y: number }): unknown {
    if (this.readOnly) {
      return nothing
    }
    const picked = new Set(this.picked)
    const byId = new Map(this.nodes.map((one) => [one.id, one]))
    return this.edges.map((edge) => {
      const key = this.keyOf(edge)
      const from = byId.get(edge.fromNode)
      const to = byId.get(edge.toNode)
      /* Nor on the one in hand, whose ends are where the draft says. */
      const lifted = this.linking?.edge === key && !this.linking.pressed
      if (!picked.has(key) || lifted || this.edgeElement(key)?.readOnly || !from || !to) {
        return nothing
      }
      const { end, start } = ends(edge, onPlane(from, origin), onPlane(to, origin))
      const at = (point: { x: number; y: number }) =>
        `--_canvas-end-x: ${point.x}px; --_canvas-end-y: ${point.y}px`
      return html`<span part="edge-end" aria-hidden="true" data-edge=${key} data-end="from" style=${at(start)}></span
        ><span part="edge-end" aria-hidden="true" data-edge=${key} data-end="to" style=${at(end)}></span>`
    })
  }

  /**
   * The layer that holds the arrowhead and the connection being drawn.
   *
   * **The arrowhead is measured in the board's own units, not in multiples of
   * the line's width.** `markerUnits="strokeWidth"` multiplies by the stroke, so
   * an eight-unit head on a two-pixel line drew a sixteen-pixel triangle that
   * read as a shape of its own rather than as a direction. In user space it is
   * eight units of the document, which is what the cards are measured in, and it
   * grows with the zoom like everything else. Each card's connections reach it
   * by its id, which every layer in this shadow root shares.
   */
  private renderEdges(origin: { x: number; y: number }, box: { width: number; height: number }) {
    return html`<svg
      part="edges"
      role="none"
      viewBox=${`0 0 ${box.width} ${box.height}`}
      width=${box.width}
      height=${box.height}
    >
      <defs>
        <marker
          id=${ARROW}
          markerHeight="8"
          markerUnits="userSpaceOnUse"
          markerWidth="8"
          orient="auto-start-reverse"
          refX="0"
          refY="4"
        >
          <path part="arrow" d="M0 0 L8 4 L0 8 z" />
        </marker>
      </defs>
      ${this.renderDraft(origin)}
    </svg>`
  }

  /**
   * Each card, and then the connections leaving it, in the order the arrows
   * walk them.
   *
   * **The order is the accessibility tree's.** The connections were one layer
   * drawn before every card, so a screen reader's reading went through every
   * connection and then every card, while the arrow keys went card by card
   * with each card's connections after it. Each card now has a slot of its
   * own, assigned by hand, with its connections' layer straight after it, so
   * both orders are the walk. The cards are read before hydration, which
   * knows none, from the default slot after these, as they always were.
   *
   * **Every layer sits under the cards by its stacking.** A layer after a card
   * in the tree would otherwise paint over it, so the styled sheet sets
   * `--helix-layer-beneath` on `edges`, and a headless page sets `z-index: -1`.
   */
  private renderStops(origin: { x: number; y: number }, box: { width: number; height: number }) {
    const elements = new Map(this.edgeElements.map((child) => [this.keyOfElement(child), child]))
    const stop =
      this.stop !== undefined && this.keyNamed(this.stop) === this.stop ? this.stop : undefined
    const picked = new Set(this.picked)
    const groups: { key: string; edges: CanvasEdge[] }[] = []
    for (const one of this.walk) {
      if (one.kind === 'node') {
        groups.push({ edges: [], key: one.key })
      } else {
        groups.at(-1)?.edges.push(one.edge)
      }
    }
    return groups.map(
      ({ edges }, at) =>
        html`<slot name=${`card-${at}`}></slot>${
          edges.length === 0
            ? nothing
            : html`<svg
                part="edges"
                role="none"
                viewBox=${`0 0 ${box.width} ${box.height}`}
                width=${box.width}
                height=${box.height}
              >
                ${edges.map((edge) => this.renderEdge(edge, origin, elements, stop, picked))}
              </svg>`
        }`,
    )
  }

  /** One connector: the target that takes focus and presses, and the line it paints. */
  private renderEdge(
    edge: CanvasEdge,
    origin: { x: number; y: number },
    elements: Map<string, HelixHeadlessCanvasEdge>,
    stop: string | undefined,
    pickedKeys: Set<string>,
  ) {
    const key = this.keyOf(edge)
    const element = elements.get(key)
    const drawn = this.geometryOf(edge, origin)
    /* The connection whose end is in hand is drawn by the draft instead,
       so a reader sees it lifted rather than drawn twice. **Lifted from
       the keyboard, its target stays**, with only the line gone: the
       target is what has focus, and taking it away dropped the reader to
       the page with no card able to take the tab stop. */
    const lifted = this.linking?.edge === key && !this.linking.pressed
    if (!drawn || (lifted && this.linking?.pointer !== undefined)) {
      return nothing
    }
    const { from, to } = drawn
    /* **`svg` and not `html`, which is the whole of whether this draws.** A
       nested template is parsed in the namespace its tag names, so a `<path>`
       built with `html` inside an `<svg>` is an unknown HTML element that
       takes the attributes, answers `querySelector` and paints nothing. It
       cost a spec that passed against a board with no lines on it. */
    const ends = heads(edge)
    /* The target comes first so the painted line after it can answer its
       focus with a sibling selector, and the painted line takes no pointer
       so a press lands on the target under it. */
    return svg`<path
        part="edge-target"
        aria-description=${[element?.tone ? this.toneLabels[element.tone] : undefined, edge.label].filter(Boolean).join(', ') || nothing}
        aria-label=${fillTemplate(this.connectionLabel, { from: this.textOf(from), to: this.textOf(to) })}
        d=${drawn.d}
        data-edge=${key}
        fill="none"
        aria-keyshortcuts="Enter F2 C Delete"
        role="button"
        tabindex=${key === stop ? '0' : '-1'}
      />
      ${
        lifted
          ? nothing
          : svg`<path
        part="edge"
        aria-hidden="true"
        d=${drawn.d}
        data-selected=${pickedKeys.has(key) ? '' : nothing}
        data-tone=${element?.tone ?? nothing}
        data-variant=${element?.variant ?? nothing}
        fill="none"
        marker-end=${ends.end ? `url(#${ARROW})` : nothing}
        marker-start=${ends.start ? `url(#${ARROW})` : nothing}
        style=${custom(element, '--canvas-edge-color') ? `--_canvas-edge-color: ${custom(element, '--canvas-edge-color')}` : nothing}
      />`
      }
`
  }

  /**
   * Sends each card to its slot, and everything else to the slot it names.
   *
   * A root that assigns by hand routes nothing by itself, the named slots
   * included, so the header, the footer and the empty state are assigned here
   * too. Paired with the walk by position, as the template was built, and a
   * card the walk does not reach, a second one of the same name, goes to the
   * default slot with everything else. On a root a server sent, which routes
   * by name, each card is sent to its slot by name instead.
   */
  private assign(): void {
    if (!this.childrenKnown) {
      return
    }
    /* The first card of each name, which is the one the walk reaches. */
    const cards = new Map<string, HelixHeadlessCanvasNode>()
    for (const card of this.cards) {
      if (!cards.has(card.name)) {
        cards.set(card.name, card)
      }
    }
    const placed = new Map<Element, string>()
    for (const [at, one] of this.walk.filter((stop) => stop.kind === 'node').entries()) {
      const card = cards.get(one.key)
      if (card) {
        placed.set(card, `card-${at}`)
      }
    }
    if (this.assignsByName) {
      for (const card of this.cards) {
        this.route(card, placed.get(card))
      }
      return
    }
    assignSlots(this.renderRoot as ParentNode | undefined, this.knownChildren, (child) =>
      placed.get(child),
    )
  }

  /**
   * The connections' labels, as text on the plane over the lines.
   *
   * **HTML and not SVG text, which is the whole of the fix.** Drawn in the
   * SVG, a label's ground was a filter flooding the text's box, and Chrome
   * kept the filter's first picture: a label drawn before the page's font had
   * loaded kept its ground and lost its words, on every board a server had not
   * rendered first. Measured as a box with nothing in it on the examples page.
   * A box of text with a background is what HTML has always done, as wide as
   * its words, spaces and all, and drawn again whenever the font changes.
   */
  private renderLabels(origin: { x: number; y: number }) {
    return this.edges.map((edge) => {
      const lifted = this.linking?.edge === this.keyOf(edge) && !this.linking.pressed
      const drawn = edge.label && !lifted ? this.geometryOf(edge, origin) : undefined
      if (!drawn) {
        return nothing
      }
      const { mid } = drawn
      return html`<span
        part="label"
        aria-hidden="true"
        style=${`--_canvas-label-x: ${mid.x}px; --_canvas-label-y: ${mid.y}px`}
        >${edge.label}</span
      >`
    })
  }

  /**
   * The connection being made, drawn from where it starts to the pointer, or to
   * the card a keyboard reader is on.
   */
  private renderDraft(origin: { x: number; y: number }) {
    const linking = this.linking
    const byId = new Map(this.nodes.map((one) => [one.id, one]))
    const anchor = linking ? byId.get(linking.from) : undefined
    if (!linking || !anchor || linking.pressed) {
      return nothing
    }
    const shifted = (node: CanvasNode) => onPlane(node, origin)
    const moved = linking.edge
      ? this.edges.find((one) => this.keyOf(one) === linking.edge)
      : undefined
    const path = moved?.path ?? this.path ?? 'curve'
    const drawnHeads = moved ? heads(moved) : { end: true, start: false }
    /* **Over a card it could arrive at, the connection it would make**, drawn
       the way it will be drawn: its path, its sides, its arrowhead. A line to
       the pointer only says the hand is moving; this says what letting go
       will do. The end in hand arrives at the side nearest the pointer. */
    const target = linking.to === undefined ? undefined : byId.get(linking.to)
    if (target) {
      const reversed = linking.moving === 'from'
      const [from, to] = reversed ? [target, anchor] : [anchor, target]
      const drawn = connector(
        {
          fromNode: from.id,
          fromSide: reversed ? linking.toSide : linking.side,
          id: '',
          toNode: to.id,
          toSide: reversed ? linking.side : linking.toSide,
        },
        shifted(from),
        shifted(to),
        path,
        drawnHeads,
      )
      return svg`<path
        part="draft"
        aria-hidden="true"
        d=${drawn.d}
        fill="none"
        marker-end=${drawnHeads.end ? `url(#${ARROW})` : nothing}
        marker-start=${drawnHeads.start ? `url(#${ARROW})` : nothing}
      />`
    }
    if (linking.at) {
      const end = { x: linking.at.x - origin.x, y: linking.at.y - origin.y }
      const start = port(shifted(anchor), linking.side ?? sideNear(anchor, linking.at))
      return svg`<path part="draft" aria-hidden="true" d=${`M ${start.x} ${start.y} L ${end.x} ${end.y}`} fill="none" />`
    }
    return nothing
  }

  protected override render(): TemplateResult {
    const nodes = this.nodes
    const drawn = extent(nodes)
    const box = { height: drawn.height + MARGIN * 2, width: drawn.width + MARGIN * 2 }
    const origin = { x: drawn.x - MARGIN, y: drawn.y - MARGIN }
    return html`<div
      part="region"
      role="group"
      aria-label=${this.label || 'Canvas'}
      aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Plus Minus"
      tabindex="0"
      @focusin=${this.idle.stir}
      @keydown=${this.handleKeydown}
      @pointerleave=${this.handlePointerLeave}
      @pointermove=${this.idle.stir}
    >
      <div part="header">
        <slot name="header"></slot>
      </div>
      <div
        part="viewport"
        style=${`--_canvas-x: ${this.at.x}px; --_canvas-y: ${this.at.y}px; --_canvas-zoom: ${this.at.zoom}; --_canvas-rule-x: ${this.at.x - origin.x * this.at.zoom}px; --_canvas-rule-y: ${this.at.y - origin.y * this.at.zoom}px; --_canvas-rule-zoom: ${ruling(this.at.zoom)}`}
        @wheel=${this.handleWheel}
      >
        <!-- **One shape, whatever the board holds**, which is what hydration
             needs: the server cannot see the cards, so a template that drew
             something else while there were none rendered one thing on the
             server and another on the client, and Lit reported a value mismatch
             at the part where the two disagreed. Emptiness is a state on the
             host instead, which is a fact about the board rather than a
             different board. -->
        <!-- Where the board sits is written on the viewport rather than the
             plane, so the box can read it too: a ruling drawn behind the plane
             has to move with it, and the plane only covers the cards. The
             ruling's own offset is where the document's zero lands, so a line
             falls on every multiple of its spacing in the document's units and
             a card placed on one sits on a line. -->
        <!-- **Focus is heard here as well as on the host.** Moving from one
             connection to the next moves focus inside this shadow root, and a
             browser does not tell the host about a move that starts and ends
             in its own tree. So the stop stayed on the first of two
             connections in a row. Heard on the board and never on the edges'
             SVG element: Chromium makes an SVG element with a focus listener
             a Tab stop of its own, an unnamed one between the board and the
             first card. Heard twice from a card, which the handler answers
             the same way both times. -->
        <div
          part="board"
          style=${`--_canvas-plane-inline-size: ${box.width}px; --_canvas-plane-block-size: ${box.height}px`}
          @focusin=${this.handleFocusIn}
        >
          ${this.renderEdges(origin, box)} ${this.renderLabels(origin)}
          ${this.renderStops(origin, box)}
          <slot @slotchange=${this.handleSlotChange}></slot>
          ${this.renderEnds(origin)}
          ${this.renderEditor(origin)}
          ${this.renderMarquee(origin)}
        </div>
        <slot name="empty"></slot>
        ${this.renderGestures()}
      </div>
      ${this.renderControls()}
      <span part="live" role="status">${this.said}</span>
      <div part="footer">
        <slot name="footer"></slot>
      </div>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-canvas': HelixHeadlessCanvas
  }
}
