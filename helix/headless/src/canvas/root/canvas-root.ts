import {
  type CanvasView,
  capturePointer,
  customElement,
  HelixBeforeMoveEvent,
  HelixBeforeReconnectEvent,
  HelixCanvasPanEvent,
  HelixCanvasViewEvent,
  HelixCanvasZoomEvent,
  HelixConnectEvent,
  HelixElement,
  HelixMoveEvent,
  HelixReconnectEvent,
  HelixRemoveEvent,
  hostAria,
  inlineStep,
  MixinViewport,
  type MoveDetail,
  type ReconnectDetail,
  type ViewportPanDetail,
  type ViewportWay,
  type ViewportZoomDetail,
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
  colorOf,
  connector,
  ends,
  extent,
  groupOf,
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
 * The ground under a connection's label, named once for the reason the arrow
 * is.
 */
const GROUND = 'canvas-label-ground'

/**
 * How far a key press moves a card, in the document's own units.
 *
 * Half the ruling's default spacing, so two presses cross one square and a card
 * moved by keys lands where one moved by hand could.
 */
const NUDGE = 16

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
 * What a connection is called in the walk and on the tab stop.
 *
 * Its element's id where it has one, and its two ends where it does not: a
 * page that writes edges without ids still gets one stop per connection.
 */
const keyOf = (edge: CanvasEdge): string => `edge:${edge.id || `${edge.fromNode}->${edge.toNode}`}`

/** A template with its `{placeholders}` filled in. */
const fill = (template: string, values: Record<string, string>): string =>
  Object.entries(values).reduce((out, [key, value]) => out.replaceAll(`{${key}}`, value), template)

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
 * @summary Draws a JSON Canvas document, read-only.
 *
 * @description
 * **The first of these surfaces Helix draws itself**, and the reason is where
 * the positions come from. On a canvas **position is data**: somebody placed
 * every card and the placement carries the meaning, so there is no layout to
 * compute and drawing is arithmetic over rectangles. A map is somebody else's
 * tiles and a graph view's positions are computed, which is why `Map` takes a
 * slotted map and this takes a document.
 *
 * **The format is open.** [JSON Canvas](https://jsoncanvas.org) gives each node
 * an `x`, `y`, `width`, `height` and a type, and each edge the two nodes it
 * joins and the sides it leaves and arrives on. A card belongs to a group when
 * it sits inside the group's bounds, which the format leaves to the geometry.
 *
 * **Accessibility is the design work, not the drawing.** The cards are text in
 * the DOM, so they are readable already; what space does not supply is an order
 * and the connections. So the family chooses an order, walks the cards in it,
 * and says every card's links as text. `order` takes `spatial`, which bands the
 * cards into rows, and `edges`, which follows the arrows from the cards nothing
 * points to.
 *
 * **Cards move by default, the way a form control takes input by default.**
 * The board writes the new `x` and `y` onto the card itself, as an input writes
 * its own value, and says so twice: `helix-before-move` for every step, which a
 * consumer holding the positions in their own state refuses and applies
 * themselves, and `helix-move` once the move is finished. `readonly` keeps every
 * card where it is, for a board that is published rather than worked on.
 * Connecting and resizing are what tldraw and React Flow are for.
 *
 * **The cards are the way around it.** One of them holds the board's tab stop,
 * arrow keys walk them in reading order, and the one a reader lands on is
 * brought into view with what it connects to read out beside it. Shift with an
 * arrow moves it, which is the keyboard's way to do what a drag does. The
 * connections leaving a card are stops of their own, straight after it, and
 * Enter on one goes to the card it arrives at.
 *
 * **Connecting and removing are requests, and the page acts on them.** Drawing
 * from a card's handle to another card, or pressing C on one and Enter on
 * another, sends `helix-connect`; Delete on a card or a connection sends
 * `helix-remove`, naming every connection a removed card would strand. A move
 * can be applied by the board because the card is already there. A connection
 * is a new element, and one a board added to markup React renders would be
 * thrown away on the next render, so the board asks and the page writes it.
 *
 * **A document rather than a `src`.** Nothing in this library fetches, and what
 * a fetch returns cannot be server-rendered: the board would be empty in the
 * served markup and arrive only once the JavaScript did, which is the opposite
 * of what every other family here promises. A consumer who has a URL reads it
 * and sets `data`.
 *
 * @since 0.100.0
 * @status experimental
 * @category media
 * @aliases Board, JSON Canvas, Whiteboard
 * @documentation https://fusion.dev/helix/components/canvas
 *
 * @slot empty - What to show where the document has no nodes.
 * @slot footer - Chrome below the board.
 * @slot header - Chrome above the board.
 *
 * @event {HelixBeforeMoveEvent} helix-before-move - Cards are about to move. Refuse it to keep the positions in your own state.
 * @event {HelixBeforeReconnectEvent} helix-before-reconnect - A connection's end is about to move to another card or side. Refuse it to keep connections in your own state.
 * @event {HelixCanvasPanEvent} helix-canvas-pan - The board moved, which on a canvas is a fact rather than a request.
 * @event {HelixCanvasViewEvent} helix-canvas-view - Where the board is looking changed, however it changed. The detail is the new view.
 * @event {HelixCanvasZoomEvent} helix-canvas-zoom - The board zoomed, and said so.
 * @event {HelixConnectEvent} helix-connect - A reader asked for two cards to be joined. Add the `helix-canvas-edge` to do it.
 * @event {HelixMoveEvent} helix-move - Cards moved and the move is finished: a drag let go, or a key pressed.
 * @event {HelixReconnectEvent} helix-reconnect - A connection's end moved, and the move is finished.
 * @event {HelixRemoveEvent} helix-remove - A reader asked for cards or connections to go. Remove the elements it names.
 *
 * @csspart arrow - The head an edge carries at an end that has one.
 * @csspart board - The plane the cards are placed on, which is what pans and zooms.
 * @csspart controls - The group the pan and zoom buttons sit in.
 * @csspart draft - The connection being drawn, before it is asked for.
 * @csspart edge - One connector between two cards.
 * @csspart edge-target - The wider, unpainted line over a connector that a reader focuses and presses.
 * @csspart edges - The layer the connectors are drawn in.
 * @csspart footer - The strip below the board.
 * @csspart fullscreen - The button that fills the screen.
 * @csspart header - The strip above the board.
 * @csspart label - The label on a connector.
 * @csspart label-ground - The flood behind a connector's label, whose `flood-color` is the board's own ground.
 * @csspart live - What the board says while a connection is being made, for a screen reader.
 * @csspart pan-down - The button that moves the board down.
 * @csspart pan-end - The button that moves the board the way the text ends.
 * @csspart pan-start - The button that moves the board the way the text starts.
 * @csspart pan-up - The button that moves the board up.
 * @csspart region - The named region the board is drawn in.
 * @csspart viewport - The box the board is drawn inside.
 * @csspart zoom-in - The button that zooms in.
 * @csspart zoom-out - The button that zooms out.
 *
 * @cssstate connecting - While a reader is drawing a connection.
 * @cssstate direct - While the board moves without easing: under the reader's hand, or settling into its box.
 * @cssstate empty - While the document has no nodes.
 * @cssstate fullscreen - While the board fills the screen.
 * @cssstate idle - While the reader has been still long enough to hide the chrome.
 */
@customElement('helix-headless-canvas')
export class HelixHeadlessCanvas extends MixinViewport(HelixElement) {
  /** How a card says where its connections come from, with `{cards}`. */
  @property({ attribute: 'comes-from-label' })
  comesFromLabel = 'from {cards}'

  /** What it says when a connection is asked for, with `{from}` and `{to}`. */
  @property({ attribute: 'connected-label' })
  connectedLabel = 'Asked to connect {from} to {to}.'

  /**
   * What the live region says when a reader starts a connection, with `{from}`
   * filled in.
   *
   * **Every sentence this board speaks is a property**, the rule the pan
   * controls already kept with `pan-label`: a board on a page in another
   * language otherwise read its connections out in English.
   */
  @property({ attribute: 'connecting-label' })
  connectingLabel =
    'Connecting from {from}. Move to another card and press Enter, or Escape to stop.'

  /**
   * What a connection is called, with `{from}` and `{to}`.
   *
   * Its own label, where it has one, is its description rather than part of
   * this, so a reader hears the ends first and what the line says after.
   */
  @property({ attribute: 'connection-label' })
  connectionLabel = 'From {from} to {to}'

  /**
   * Accessible name for the board, which is the one thing a consumer must write.
   *
   * A document has no name of its own in the format, and "Canvas" names the
   * widget rather than the thinking on it.
   */
  @property()
  label = ''

  /**
   * How a card says where its connections go, with `{cards}` as the list.
   *
   * The list is joined the way the page's language joins one, "Second and
   * Third", rather than with a comma this component chose.
   */
  @property({ attribute: 'leads-to-label' })
  leadsToLabel = 'leads to {cards}'

  /**
   * The order a reader meets the cards in.
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
   * How every connection travels, where it does not say: `straight`, or `step`
   * for right angles.
   *
   * Absent is a curve. A flowchart wants `step` on all of its edges, and
   * writing it once here rather than on each is the reason this exists; an
   * edge's own `path` still wins.
   */
  @property({ reflect: true })
  path?: 'straight' | 'step'

  /**
   * Keeps every card where its author put it.
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
   * What the live region says when a reader picks up a connection's end, with
   * `{from}` and `{to}`.
   */
  @property({ attribute: 'reconnecting-label' })
  reconnectingLabel =
    'Moving the end of the connection from {from} to {to}. Move to a card and press Enter, or Escape to stop.'

  /** What it says when a reader stops connecting without asking. */
  @property({ attribute: 'stopped-label' })
  stoppedLabel = 'Stopped connecting.'

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
    return this.knownChildren.filter(
      (child): child is HelixHeadlessCanvasNode => child instanceof HelixHeadlessCanvasNode,
    )
  }

  /** The same, as the shape the geometry works in. */
  private get nodes(): CanvasNode[] {
    return this.cards.map((card) => ({
      color: colorOf(card.tone, custom(card, '--canvas-node-color')),
      height: card.height,
      id: card.name,
      /* An empty label is no label: `??` falls through on nothing at all, and a
         card that named itself with the empty string would be read out as one. */
      label: card.label || undefined,
      text: card.textContent?.trim() || undefined,
      type: card.group ? 'group' : 'text',
      width: card.width,
      x: card.x,
      y: card.y,
    }))
  }

  /** The connectors a consumer declared, which draw nothing themselves. */
  private get edges(): CanvasEdge[] {
    return this.knownChildren
      .filter((child): child is HelixHeadlessCanvasEdge => child instanceof HelixHeadlessCanvasEdge)
      .map((edge) => ({
        color: colorOf(edge.tone, custom(edge, '--canvas-edge-color')),
        fromEnd: edge.fromEnd,
        fromNode: edge.from,
        fromSide: edge.fromSide,
        id: edge.name,
        label: edge.label,
        path: edge.path,
        toEnd: edge.toEnd,
        toNode: edge.to,
        toSide: edge.toSide,
      }))
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
    const by = {
      down: { x: 0, y: -step },
      end: { x: -step, y: 0 },
      start: { x: step, y: 0 },
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
  show(id: string): void {
    this.direct = false
    const node = this.nodes.find((one) => one.id === id)
    if (!node) {
      return
    }
    this.touched = true
    this.stop = id
    const board = extent(this.nodes)
    const middle = {
      x: (node.x - board.x + MARGIN + node.width / 2) * this.at.zoom,
      y: (node.y - board.y + MARGIN + node.height / 2) * this.at.zoom,
    }
    this.at = {
      ...this.at,
      x: this.box.width / 2 - middle.x,
      y: this.box.height / 2 - middle.y,
    }
  }

  /** Where a drag started, and where the board was when it did. */
  private dragging:
    | { pointer: number; from: { x: number; y: number }; at: { x: number; y: number } }
    | undefined

  /**
   * A press on a card that may become a move, with where everything it carries
   * started. `moved` is what the last step settled on, which the drop reports.
   */
  private carrying:
    | {
        pointer: number
        from: { x: number; y: number }
        started: boolean
        cards: Array<{ card: HelixHeadlessCanvasNode; x: number; y: number }>
        moved?: MoveDetail
      }
    | undefined

  /**
   * Every stop in the order the arrows walk them: each card in reading order,
   * then the connections leaving it.
   */
  private get walk(): Stop[] {
    const edges = this.edges
    return reading(this.nodes, edges, this.order ?? 'spatial').flatMap((node): Stop[] => [
      { key: node.id, kind: 'node' },
      ...edges
        .filter((edge) => edge.fromNode === node.id)
        .map((edge): Stop => ({ edge, key: keyOf(edge), kind: 'edge' })),
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
    this.cards.find((one) => one.name === key)?.focus()
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
    const node = this.nodes.find((one) => one.id === id)
    return node ? this.textOf(node) : id
  }

  /** Starts a connection from a card, from the keyboard. */
  private startLinking(from: string): void {
    this.linking = { from }
    this.said = fill(this.connectingLabel, { from: this.nameOf(from) })
  }

  /**
   * A card a connection could arrive at, or nothing: not the card it started
   * from, and not one that is held.
   */
  private arrival(name: string | undefined): string | undefined {
    const card = this.cardNamed(name)
    return card && name !== this.linking?.from && !this.fixed(card) ? name : undefined
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
    this.said = fill(this.connectedLabel, {
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
    const edge = this.edges.find((one) => keyOf(one) === key)
    if (!edge) {
      return
    }
    const stays = moving === 'to' ? edge.fromNode : edge.toNode
    this.linking = {
      edge: key,
      from: stays,
      moving,
      side: moving === 'to' ? edge.fromSide : edge.toSide,
      ...(pointer ? { at: this.toDocument(pointer), pointer: pointer.pointerId } : {}),
    }
    this.said = pointer
      ? ''
      : fill(this.reconnectingLabel, {
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
    const edge = linking ? this.edges.find((one) => keyOf(one) === linking.edge) : undefined
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
            ...(edge.toSide === undefined ? {} : { toSide: edge.toSide }),
          }
        : {
            from: edge.fromNode,
            name: edge.id,
            to: arriving,
            was: { from: edge.fromNode, to: edge.toNode },
            ...(edge.fromSide === undefined ? {} : { fromSide: edge.fromSide }),
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
    }
    this.dispatchEvent(new HelixReconnectEvent(detail))
  }

  /**
   * Asks for a card or a connection to go, and moves focus on once it has.
   *
   * A card takes every connection touching it, which would otherwise stop being
   * drawn and stay behind in the page's markup as an element joining nothing.
   */
  private requestRemove(key: string): void {
    const walk = this.walk
    const at = walk.findIndex((one) => one.key === key)
    const edges = this.edges
    const detail = key.startsWith('edge:')
      ? {
          edges: edges
            .filter((edge) => keyOf(edge) === key)
            .map((edge) => ({ from: edge.fromNode, name: edge.id, to: edge.toNode })),
          nodes: [],
        }
      : {
          edges: edges
            .filter((edge) => edge.fromNode === key || edge.toNode === key)
            .map((edge) => ({ from: edge.fromNode, name: edge.id, to: edge.toNode })),
          nodes: [key],
        }
    const gone = new Set([
      key,
      ...detail.edges.map((one) => keyOf({ fromNode: one.from, id: one.name, toNode: one.to })),
    ])
    /* The next stop that is not going too, or the one before where nothing
       after it is left. */
    const next =
      walk.slice(at + 1).find((one) => !gone.has(one.key)) ??
      walk
        .slice(0, at)
        .reverse()
        .find((one) => !gone.has(one.key))
    this.refocus = { gone: [...gone], next: next?.key }
    this.dispatchEvent(new HelixRemoveEvent(detail))
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
    return this.knownChildren.find(
      (child): child is HelixHeadlessCanvasEdge =>
        child instanceof HelixHeadlessCanvasEdge &&
        keyOf({ fromNode: child.from, id: child.name, toNode: child.to }) === key,
    )
  }

  /** A card by name. */
  private cardNamed(name: string | undefined): HelixHeadlessCanvasNode | undefined {
    return name === undefined ? undefined : this.cards.find((one) => one.name === name)
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
    for (const { name, x, y } of detail.nodes) {
      const card = this.cards.find((one) => one.name === name)
      if (card) {
        card.x = x
        card.y = y
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
    /* **A press on a connection picks up its nearer end**, once the hand has
       moved far enough to be a drag rather than a click that focuses it. */
    const pressedEdge = this.edgeOf(event)
    if (pressedEdge !== undefined && !this.readOnly && !this.edgeElement(pressedEdge)?.readOnly) {
      const edge = this.edges.find((one) => keyOf(one) === pressedEdge)
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
        capturePointer(this, event.pointerId)
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
        pointer: event.pointerId,
        side: handle.getAttribute('data-side') as CanvasSide,
      }
      capturePointer(this, event.pointerId)
      return
    }
    /* A press on a card carries the card, unless it is held, where it pans
       like a press anywhere else. */
    if (card && !this.fixed(card)) {
      this.carrying = {
        cards: this.carried(card).map((one) => ({ card: one, x: one.x, y: one.y })),
        from: { x: event.clientX, y: event.clientY },
        pointer: event.pointerId,
        started: false,
      }
      capturePointer(this, event.pointerId)
      return
    }
    this.touched = true
    this.direct = true
    this.dragging = {
      at: { x: this.at.x, y: this.at.y },
      from: { x: event.clientX, y: event.clientY },
      pointer: event.pointerId,
    }
    capturePointer(this, event.pointerId)
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    this.idle.stir()
    if (this.linking?.pointer === event.pointerId) {
      const pressed = this.linking.pressed
      if (pressed && Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) < SLOP) {
        return
      }
      const at = this.toDocument(event)
      const over = this.cardAt(at)
      const to = this.arrival(over?.id)
      this.linking = {
        ...this.linking,
        at,
        pressed: undefined,
        to,
        toSide: to !== undefined && over ? sideNear(over, at) : undefined,
      }
      return
    }
    const carry = this.carrying
    if (carry && carry.pointer === event.pointerId) {
      const across = event.clientX - carry.from.x
      const down = event.clientY - carry.from.y
      if (!carry.started && Math.hypot(across, down) < SLOP) {
        return
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
    if (this.linking?.pointer === event.pointerId) {
      /* A press on a connection that never became a drag was a click, which
         focused it; nothing is picked up and nothing is asked for. */
      if (this.linking.pressed) {
        this.linking = undefined
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
      this.finishLinking(this.linking.to, this.linking.toSide)
      return
    }
    const carry = this.carrying
    if (carry?.pointer === event.pointerId) {
      this.carrying = undefined
      if (carry.moved) {
        this.dispatchEvent(new HelixMoveEvent(carry.moved))
      }
      return
    }
    if (this.dragging?.pointer === event.pointerId) {
      this.dragging = undefined
      /* The hand is off it, so the next press glides again. Cleared here rather
         than left standing, or a board dragged once would never ease a press on
         the pad for the rest of the page's life. */
      this.direct = false
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
    if (!event.ctrlKey && !this.filled) {
      return
    }
    event.preventDefault()
    this.touched = true
    this.direct = true
    if (event.ctrlKey) {
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

    if (card && event.shiftKey && (along !== 0 || down !== 0)) {
      event.preventDefault()
      if (this.fixed(card)) {
        return
      }
      const detail: MoveDetail = {
        nodes: this.carried(card).map((one) => ({
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
    if (event.key === 'Escape') {
      event.preventDefault()
      if (this.linking) {
        const back = this.linking.edge ?? this.linking.from
        this.linking = undefined
        this.said = this.stoppedLabel
        this.focusStop(back)
        return
      }
      this.partNamed('region')?.focus()
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      if (card && this.linking) {
        event.preventDefault()
        this.finishLinking(card.name)
        return
      }
      if (edge !== undefined) {
        event.preventDefault()
        const to = this.edges.find((one) => keyOf(one) === edge)?.toNode
        this.focusStop(to)
      }
      return
    }
    if (card && !this.fixed(card) && !this.linking && (event.key === 'c' || event.key === 'C')) {
      event.preventDefault()
      this.startLinking(card.name)
      return
    }
    if (
      edge !== undefined &&
      !this.linking &&
      !this.readOnly &&
      !this.edgeElement(edge)?.readOnly &&
      (event.key === 'c' || event.key === 'C')
    ) {
      event.preventDefault()
      this.startReconnect(edge, 'to')
      return
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const held = card ? this.fixed(card) : this.readOnly || this.edgeElement(key)?.readOnly
      if (!held) {
        event.preventDefault()
        this.requestRemove(key)
      }
      return
    }
    /* Walking while connecting stops on cards only: a connection is not
       somewhere a new one can arrive. */
    const walk = this.linking ? this.walk.filter((one) => one.kind === 'node') : this.walk
    const at = walk.findIndex((one) => one.key === key)
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
    if (card) {
      /* A keyboard reader connecting arrives wherever they land, and the
         preview follows them there. */
      if (this.linking) {
        this.linking = { ...this.linking, to: this.arrival(card.name) }
      }
      this.reveal(card.name)
    }
  }

  /** Brings a card into view, where it is not already whole in it. */
  private reveal(id: string): void {
    const node = this.nodes.find((one) => one.id === id)
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
    const named = (id: string): string => {
      const other = this.nodes.find((one) => one.id === id)
      return other ? this.textOf(other) : id
    }
    const leads = this.edges
      .filter((one) => one.fromNode === node.id)
      .map((one) => named(one.toNode))
    const from = this.edges
      .filter((one) => one.toNode === node.id)
      .map((one) => named(one.fromNode))
    const lang = this.closest('[lang]')?.getAttribute('lang') || undefined
    const list = new Intl.ListFormat(lang, { type: 'conjunction' })
    return [
      leads.length > 0 ? fill(this.leadsToLabel, { cards: list.format(leads) }) : '',
      from.length > 0 ? fill(this.comesFromLabel, { cards: list.format(from) }) : '',
    ]
      .filter(Boolean)
      .join('; ')
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
   * Where the board is looking: the document's point at the middle of the view,
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
    const origin = this.origin ?? { x: 0, y: 0 }
    const { height, width } = this.box
    return {
      x: origin.x + (width / 2 - this.at.x) / this.at.zoom,
      y: origin.y + (height / 2 - this.at.y) / this.at.zoom,
      zoom: this.at.zoom,
    }
  }

  set view(next: CanvasView) {
    const origin = this.origin ?? { x: 0, y: 0 }
    const { height, width } = this.box
    const zoom = Math.min(Math.max(next.zoom, ZOOM_MIN), ZOOM_MAX)
    this.touched = true
    this.direct = false
    this.at = {
      x: width / 2 - (next.x - origin.x) * zoom,
      y: height / 2 - (next.y - origin.y) * zoom,
      zoom,
    }
  }

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
    return {
      edges: this.edges,
      nodes: this.nodes,
    }
  }

  /**
   * Fits the whole board into the box, centered, and never magnified past its
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
  }

  /** A card added or taken away is a board of a different size. */
  private readonly handleSlotChange = (): void => {
    this.requestUpdate()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
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
    this.addEventListener('focusin', this.handleFocusIn)
    this.addEventListener('keydown', this.handleStopKeydown)
    this.addEventListener('pointercancel', this.handlePointerUp)
    this.addEventListener('pointerdown', this.handlePointerDown)
    this.addEventListener('pointermove', this.handlePointerMove)
    this.addEventListener('pointerup', this.handlePointerUp)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.sizes?.disconnect()
    this.watched = undefined
    this.removeEventListener('focusin', this.handleFocusIn)
    this.removeEventListener('keydown', this.handleStopKeydown)
    this.removeEventListener('pointercancel', this.handlePointerUp)
    this.removeEventListener('pointerdown', this.handlePointerDown)
    this.removeEventListener('pointermove', this.handlePointerMove)
    this.removeEventListener('pointerup', this.handlePointerUp)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
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
    this.toggleState('connecting', this.linking !== undefined)
    this.toggleState('direct', this.direct)
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
    /* The first card in reading order until a reader has landed on one, and
       again if the one they were on is taken away. */
    const stop = this.walk.some((one) => one.key === this.stop)
      ? this.stop
      : reading(all, this.edges, this.order ?? 'spatial')[0]?.id
    for (const card of this.cards) {
      const group = card.group
        ? undefined
        : groupOf(
            {
              height: card.height,
              id: card.name,
              type: 'text',
              width: card.width,
              x: card.x,
              y: card.y,
            },
            all,
          )
      card.style.setProperty('--_canvas-card-x', `${card.x - origin.x}px`)
      card.style.setProperty('--_canvas-card-y', `${card.y - origin.y}px`)
      card.style.setProperty('--_canvas-card-inline-size', `${card.width}px`)
      card.style.setProperty('--_canvas-card-block-size', `${card.height}px`)
      if (group) {
        card.setAttribute('data-group', group.id)
      } else {
        card.removeAttribute('data-group')
      }
      const node = all.find((one) => one.id === card.name)
      card.links = node ? this.linksOf(node) : ''
      card.current = card.name === stop
      card.connectable = !this.fixed(card)
      /* While a connection is being drawn, every card it could arrive at says
         so and the one under the pointer says it most: a line dragged across a
         board of cards that looked the same everywhere gave no way to tell
         where letting go would land. */
      card.candidate = this.linking !== undefined && this.arrival(card.name) !== undefined
      card.target = this.linking?.to === card.name
    }
  }

  /**
   * The connectors, in one layer under the cards.
   *
   * **The arrowhead is measured in the board's own units, not in multiples of
   * the line's width.** `markerUnits="strokeWidth"` multiplies by the stroke, so
   * an eight-unit head on a two-pixel line drew a sixteen-pixel triangle that
   * read as a shape of its own rather than as a direction. In user space it is
   * eight units of the document, which is what the cards are measured in, and it
   * grows with the zoom like everything else.
   */
  private renderEdges(origin: { x: number; y: number }, box: { width: number; height: number }) {
    const byId = new Map(this.nodes.map((one) => [one.id, one]))
    const elements = new Map(
      this.knownChildren
        .filter(
          (child): child is HelixHeadlessCanvasEdge => child instanceof HelixHeadlessCanvasEdge,
        )
        .map((child) => [keyOf({ fromNode: child.from, id: child.name, toNode: child.to }), child]),
    )
    const stop = this.walk.some((one) => one.key === this.stop) ? this.stop : undefined
    const shifted = (node: CanvasNode) => ({
      ...node,
      x: node.x - origin.x,
      y: node.y - origin.y,
    })
    /* **Not hidden as a whole any more**, because a connection is now something
       a reader focuses. What is drawn is hidden, piece by piece: the painted
       line and its label are pictures of what the target already names. */
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
        <!-- **A box of ground behind a label, as wide as the label is**, which
             is what a filter region is: a flood the size of the text's own
             bounding box, a little larger on every side, with the text over
             it. An outline stroked around the letters was the first answer and
             only covers the letters, so the line showed through every gap
             between them and every space between the words. -->
        <!-- In sRGB, or the flood is mixed in linear light and comes out a
             shade lighter than the same color painted anywhere else, which
             drew a box around every label. -->
        <filter
          id=${GROUND}
          color-interpolation-filters="sRGB"
          x="-0.08"
          y="-0.25"
          width="1.16"
          height="1.5"
        >
          <feFlood part="label-ground" />
          <feComposite in="SourceGraphic" operator="over" />
        </filter>
      </defs>
      ${this.edges.map((edge) => {
        const from = byId.get(edge.fromNode)
        const to = byId.get(edge.toNode)
        if (!from || !to) {
          return nothing
        }
        const key = keyOf(edge)
        const element = elements.get(key)
        /* The connection whose end is in hand is drawn by the draft instead,
           so a reader sees it lifted rather than drawn twice. */
        if (this.linking?.edge === key && !this.linking.pressed) {
          return nothing
        }
        const drawn = connector(
          edge,
          shifted(from),
          shifted(to),
          edge.path ?? this.path ?? 'curve',
          heads(edge),
        )
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
            aria-description=${edge.label || nothing}
            aria-label=${fill(this.connectionLabel, { from: this.textOf(from), to: this.textOf(to) })}
            d=${drawn.d}
            data-edge=${key}
            fill="none"
            role="button"
            tabindex=${key === stop ? '0' : '-1'}
          />
          <path
            part="edge"
            aria-hidden="true"
            d=${drawn.d}
            data-tone=${element?.tone ?? nothing}
            data-variant=${element?.variant ?? nothing}
            fill="none"
            marker-end=${ends.end ? `url(#${ARROW})` : nothing}
            marker-start=${ends.start ? `url(#${ARROW})` : nothing}
            style=${custom(element, '--canvas-edge-color') ? `--_canvas-edge-color: ${custom(element, '--canvas-edge-color')}` : nothing}
          />
          ${
            edge.label
              ? svg`<text part="label" aria-hidden="true" x=${drawn.mid.x} y=${drawn.mid.y} dominant-baseline="central" filter=${`url(#${GROUND})`} text-anchor="middle">
                  ${edge.label}
                </text>`
              : nothing
          }`
      })}
      ${this.renderDraft(byId, shifted)}
    </svg>`
  }

  /**
   * The connection being made, drawn from where it starts to the pointer, or to
   * the card a keyboard reader is on.
   */
  private renderDraft(byId: Map<string, CanvasNode>, shifted: (node: CanvasNode) => CanvasNode) {
    const linking = this.linking
    const anchor = linking ? byId.get(linking.from) : undefined
    if (!linking || !anchor || linking.pressed) {
      return nothing
    }
    const origin = this.origin ?? { x: 0, y: 0 }
    const moved = linking.edge ? this.edges.find((one) => keyOf(one) === linking.edge) : undefined
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
      @pointerleave=${this.idle.leave}
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
        <div
          part="board"
          style=${`--_canvas-plane-inline-size: ${box.width}px; --_canvas-plane-block-size: ${box.height}px`}
        >
          ${this.renderEdges(origin, box)}
          <slot @slotchange=${this.handleSlotChange}></slot>
        </div>
        <slot name="empty"></slot>
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
