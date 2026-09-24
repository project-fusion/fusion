import {
  capturePointer,
  customElement,
  HelixBeforeMoveEvent,
  HelixCanvasPanEvent,
  HelixCanvasZoomEvent,
  HelixElement,
  HelixMoveEvent,
  hostAria,
  inlineStep,
  MixinViewport,
  type MoveDetail,
  type ViewportPanDetail,
  type ViewportWay,
  type ViewportZoomDetail,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, svg, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { HelixHeadlessCanvasEdge } from '../edge/canvas-edge.js'
import { HelixHeadlessCanvasNode } from '../node/canvas-node.js'
import {
  type CanvasEdge,
  type CanvasNode,
  connector,
  extent,
  groupOf,
  inside,
  reading,
} from './canvas-document.js'

export type { CanvasEdge, CanvasEnd, CanvasNode, CanvasSide } from './canvas-document.js'

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
 * A color the document named, as a preset number or as its own value.
 *
 * JSON Canvas writes either: `1` to `6`, which mean whatever the application
 * says and here point at semantic tokens, or a hex a document chose for itself.
 * A preset becomes an attribute a stylesheet can match and a hex becomes a
 * property it can read, because no stylesheet can enumerate the second.
 */
const preset = (color: string | undefined): string | undefined =>
  color !== undefined && /^[1-6]$/.test(color) ? color : undefined

const own = (color: string | undefined): string | undefined =>
  color !== undefined && preset(color) === undefined ? color : undefined

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
 * arrow moves it, which is the keyboard's way to do what a drag does.
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
 * @event {HelixCanvasPanEvent} helix-canvas-pan - The board moved, which on a canvas is a fact rather than a request.
 * @event {HelixCanvasZoomEvent} helix-canvas-zoom - The board zoomed, and said so.
 * @event {HelixMoveEvent} helix-move - Cards moved and the move is finished: a drag let go, or a key pressed.
 *
 * @csspart arrow - The head an edge carries at an end that has one.
 * @csspart board - The plane the cards are placed on, which is what pans and zooms.
 * @csspart controls - The group the pan and zoom buttons sit in.
 * @csspart edge - One connector between two cards.
 * @csspart edges - The layer the connectors are drawn in.
 * @csspart footer - The strip below the board.
 * @csspart fullscreen - The button that fills the screen.
 * @csspart header - The strip above the board.
 * @csspart label - The label on a connector.
 * @csspart pan-down - The button that moves the board down.
 * @csspart pan-end - The button that moves the board the way the text ends.
 * @csspart pan-start - The button that moves the board the way the text starts.
 * @csspart pan-up - The button that moves the board up.
 * @csspart region - The named region the board is drawn in.
 * @csspart viewport - The box the board is drawn inside.
 * @csspart zoom-in - The button that zooms in.
 * @csspart zoom-out - The button that zooms out.
 *
 * @cssstate direct - While the board moves without easing: under the reader's hand, or settling into its box.
 * @cssstate empty - While the document has no nodes.
 * @cssstate fullscreen - While the board fills the screen.
 * @cssstate idle - While the reader has been still long enough to hide the chrome.
 */
@customElement('helix-headless-canvas')
export class HelixHeadlessCanvas extends MixinViewport(HelixElement) {
  /**
   * Accessible name for the board, which is the one thing a consumer must write.
   *
   * A document has no name of its own in the format, and "Canvas" names the
   * widget rather than the thinking on it.
   */
  @property()
  label = ''

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

  /** The card that holds the board's one tab stop, by id. */
  @state()
  private stop?: string

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
      color: card.color,
      height: card.height,
      id: card.id,
      /* An empty label is no label: `??` falls through on nothing at all, and a
         card that named itself with the empty string would be read out as one. */
      label: card.label || undefined,
      text: card.textContent?.trim() || undefined,
      type: card.type ?? 'text',
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
        color: edge.color,
        fromEnd: edge.fromEnd,
        fromNode: edge.from,
        fromSide: edge.fromSide,
        id: edge.id,
        label: edge.label,
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

  protected override get controlsLabel(): string {
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
   * Held between a quarter and four times, which is far enough out to see a
   * large board whole and far enough in to read a card that was drawn small.
   */
  override zoom(by: number): void {
    this.direct = false
    this.touched = true
    this.zoomAbout(by > 0 ? 1.25 : 1 / 1.25, { x: this.box.width / 2, y: this.box.height / 2 })
    super.zoom(by)
  }

  /**
   * Brings a card to the middle of the viewport.
   *
   * This is what the reading list is for: a reader who cannot see the board
   * chooses a card and the board comes to it, so the list is a way around
   * rather than a second copy of the text.
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
    if (card.type !== 'group') {
      return [card]
    }
    const box = { height: card.height, width: card.width, x: card.x, y: card.y }
    return [
      card,
      ...this.cards.filter(
        (one) =>
          one !== card && inside({ height: one.height, width: one.width, x: one.x, y: one.y }, box),
      ),
    ]
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
    for (const { id, x, y } of detail.nodes) {
      const card = this.cards.find((one) => one.id === id)
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
    /* A press on a card carries the card, unless the board is read-only, where
       it pans like a press anywhere else. */
    if (card && !this.readOnly) {
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
          id: card.id,
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
   * The keys on a card: arrows walk the cards, and Shift with an arrow moves one.
   *
   * **Only from the card itself**, not from inside what it holds: a card may
   * hold a link, a field or a chart that answers the arrows itself, and a press
   * taken from under one of those walked the board instead of the chart.
   *
   * **Arrows walk in reading order rather than in space.** The next card in the
   * order is the one a reader who cannot see the board needs, and the spatial
   * neighbor is a guess about where they think they are. Right and down go on,
   * left and up go back, Home and End go to the ends, and Escape goes back out
   * to the board, where the arrows pan it again.
   */
  private readonly handleCardKeydown = (event: KeyboardEvent): void => {
    const card = this.cardOf(event)
    const origin = event.composedPath()[0] as Element | undefined
    if (!card || origin?.getAttribute?.('part') !== 'node') {
      return
    }
    const along = inlineStep(this, event.key)
    const down = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
    if (event.shiftKey && (along !== 0 || down !== 0)) {
      event.preventDefault()
      if (this.readOnly) {
        return
      }
      const detail: MoveDetail = {
        nodes: this.carried(card).map((one) => ({
          id: one.id,
          x: one.x + along * NUDGE,
          y: one.y + down * NUDGE,
        })),
      }
      if (this.requestMove(detail)) {
        this.dispatchEvent(new HelixMoveEvent(detail))
      }
      void this.updateComplete.then(() => this.reveal(card.id))
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      this.partNamed('region')?.focus()
      return
    }
    const ordered = reading(this.nodes, this.edges, this.order ?? 'spatial')
    const at = ordered.findIndex((one) => one.id === card.id)
    const to =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? ordered.length - 1
          : along + down !== 0
            ? Math.min(Math.max(at + Math.sign(along + down), 0), ordered.length - 1)
            : undefined
    if (to === undefined) {
      return
    }
    event.preventDefault()
    const next = this.cards.find((one) => one.id === ordered[to]?.id)
    next?.focus()
  }

  /**
   * A card a reader landed on becomes the tab stop, and comes into view.
   *
   * Into view rather than to the middle: a reader walking a row of cards that
   * are all on screen should see the focus ring move along it, not the board
   * lurch under every press.
   */
  private readonly handleFocusIn = (event: FocusEvent): void => {
    const card = this.cardOf(event)
    if (!card) {
      return
    }
    this.stop = card.id
    this.reveal(card.id)
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
    const to = Math.min(Math.max(from * by, 0.25), 4)
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
    return [
      leads.length > 0 ? `leads to ${leads.join(', ')}` : '',
      from.length > 0 ? `from ${from.join(', ')}` : '',
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
    this.watchBox()
    if (!this.touched) {
      this.fitInto(true)
    }
  }

  /** Keeps one observer on the box, so a fit follows a resize that has not happened yet. */
  private watchBox(): void {
    const viewport = this.renderRoot?.querySelector('[part="viewport"]')
    if (typeof ResizeObserver === 'undefined' || !viewport) {
      return
    }
    this.sizes ??= new ResizeObserver(() => {
      if (!this.touched) {
        this.fitInto(true)
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
    this.addEventListener('keydown', this.handleCardKeydown)
    this.addEventListener('pointercancel', this.handlePointerUp)
    this.addEventListener('pointerdown', this.handlePointerDown)
    this.addEventListener('pointermove', this.handlePointerMove)
    this.addEventListener('pointerup', this.handlePointerUp)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.sizes?.disconnect()
    this.removeEventListener('focusin', this.handleFocusIn)
    this.removeEventListener('keydown', this.handleCardKeydown)
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
    const stop = all.some((one) => one.id === this.stop)
      ? this.stop
      : reading(all, this.edges, this.order ?? 'spatial')[0]?.id
    for (const card of this.cards) {
      const group =
        card.type === 'group'
          ? undefined
          : groupOf(
              {
                height: card.height,
                id: card.id,
                type: card.type ?? 'text',
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
      const chosen = own(card.color)
      if (chosen === undefined) {
        card.style.removeProperty('--_canvas-card-color')
      } else {
        card.style.setProperty('--_canvas-card-color', chosen)
      }
      if (group) {
        card.setAttribute('data-group', group.id)
      } else {
        card.removeAttribute('data-group')
      }
      const node = all.find((one) => one.id === card.id)
      card.links = node ? this.linksOf(node) : ''
      card.current = card.id === stop
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
    return html`<svg
      part="edges"
      aria-hidden="true"
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
          refX="7"
          refY="4"
        >
          <path part="arrow" d="M0 0 L8 4 L0 8 z" />
        </marker>
      </defs>
      ${this.edges.map((edge) => {
        const from = byId.get(edge.fromNode)
        const to = byId.get(edge.toNode)
        if (!from || !to) {
          return nothing
        }
        const shifted = (node: CanvasNode) => ({
          ...node,
          x: node.x - origin.x,
          y: node.y - origin.y,
        })
        const drawn = connector(edge, shifted(from), shifted(to))
        /* **`svg` and not `html`, which is the whole of whether this draws.** A
           nested template is parsed in the namespace its tag names, so a `<path>`
           built with `html` inside an `<svg>` is an unknown HTML element that
           takes the attributes, answers `querySelector` and paints nothing. It
           cost a spec that passed against a board with no lines on it. */
        const ends = heads(edge)
        return svg`<path
            part="edge"
            d=${drawn.d}
            data-color=${preset(edge.color) ?? nothing}
            fill="none"
            marker-end=${ends.end ? `url(#${ARROW})` : nothing}
            marker-start=${ends.start ? `url(#${ARROW})` : nothing}
            style=${own(edge.color) === undefined ? nothing : `--_canvas-edge-color: ${own(edge.color)}`}
          />
          ${
            edge.label
              ? svg`<text part="label" x=${drawn.mid.x} y=${drawn.mid.y} text-anchor="middle">
                  ${edge.label}
                </text>`
              : nothing
          }`
      })}
    </svg>`
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
        style=${`--_canvas-x: ${this.at.x}px; --_canvas-y: ${this.at.y}px; --_canvas-zoom: ${this.at.zoom}; --_canvas-rule-x: ${this.at.x - origin.x * this.at.zoom}px; --_canvas-rule-y: ${this.at.y - origin.y * this.at.zoom}px`}
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
