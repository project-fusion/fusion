import {
  capturePointer,
  customElement,
  HelixCanvasPanEvent,
  HelixCanvasZoomEvent,
  HelixElement,
  hostAria,
  MixinViewport,
  type ViewportPanDetail,
  type ViewportWay,
  type ViewportZoomDetail,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, svg, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import {
  type CanvasDocument,
  type CanvasEdge,
  type CanvasNode,
  connector,
  extent,
  groupOf,
  reading,
} from './canvas-document.js'

export type {
  CanvasDocument,
  CanvasEdge,
  CanvasEnd,
  CanvasNode,
  CanvasSide,
} from './canvas-document.js'

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
 * What a consumer may draw a card's body with, where plain text is not enough.
 *
 * **A string is text and a template is markup, and the split is the safety.** A
 * card's text comes from a document this component did not write, so a string
 * comes back escaped; a consumer who wants Markdown builds a template and the
 * `unsafeHTML` that entails sits in their file, beside the sanitiser they chose,
 * rather than in this one where neither is visible.
 */
export type CanvasCardRenderer = (node: CanvasNode) => string | TemplateResult

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
 * and the connections. So the family chooses an order, says every card's links
 * as text, and lets a reader choose one and bring the board to it. `order`
 * takes `spatial`, which bands the cards into rows, and `edges`, which follows
 * the arrows from the cards nothing points to.
 *
 * **Read-only, and that is the scope rather than a stage.** Dragging,
 * connecting and resizing are what tldraw and React Flow are for; a canvas that
 * only draws is already useful for publishing somebody's thinking, and it is
 * the half that has an open format behind it.
 *
 * **A document rather than a `src`.** Nothing in this library fetches, and what
 * a fetch returns cannot be server-rendered: the board would be empty in the
 * served markup and arrive only once the JavaScript did, which is the opposite
 * of what every other family here promises. A consumer who has a URL reads it
 * and sets `data`.
 *
 * @since 0.100.0
 * @status stable
 * @category media
 * @aliases Board, JSON Canvas, Whiteboard
 * @documentation https://fusion.dev/helix/components/canvas
 *
 * @slot empty - What to show where the document has no nodes.
 * @slot footer - Chrome below the board.
 * @slot header - Chrome above the board.
 *
 * @event {HelixCanvasPanEvent} helix-canvas-pan - The board moved, which on a canvas is a fact rather than a request.
 * @event {HelixCanvasZoomEvent} helix-canvas-zoom - The board zoomed, and said so.
 *
 * @csspart arrow - The head an edge carries at an end that has one.
 * @csspart board - The plane the cards are placed on, which is what pans and zooms.
 * @csspart card - One card, group or link.
 * @csspart controls - The group the pan and zoom buttons sit in.
 * @csspart edge - One connector between two cards.
 * @csspart edges - The layer the connectors are drawn in.
 * @csspart footer - The strip below the board.
 * @csspart fullscreen - The button that fills the screen.
 * @csspart header - The strip above the board.
 * @csspart index - The list that gives the board a reading order.
 * @csspart index-item - One card's entry in that list.
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
 * @cssstate empty - While the document has no nodes.
 * @cssstate fullscreen - While the board fills the screen.
 * @cssstate idle - While the reader has been still long enough to hide the chrome.
 */
@customElement('helix-headless-canvas')
export class HelixHeadlessCanvas extends MixinViewport(HelixElement) {
  /**
   * The document to draw.
   *
   * A property and not an attribute, an object being no kind of string. React
   * applies it once the element upgrades, which is the route `react.mdx`
   * describes for every object property in this library.
   */
  @property({ attribute: false })
  data?: CanvasDocument

  /**
   * What the reading list is called.
   */
  @property({ attribute: 'index-label' })
  indexLabel = 'Cards on this board'

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
   * Draws a card's body, for a consumer whose cards are not plain text.
   *
   * **Plain text by default, and the default is the safe one.** A card's text
   * comes from a document this component did not write, so it is set as text
   * and not as markup. A consumer who wants Markdown returns a template, which
   * puts the `unsafeHTML` and the sanitiser they chose in their file rather than
   * this one. What comes back is placed under `data-prose` either way, so a
   * stylesheet can tell a drawn card from a plain one.
   */
  @property({ attribute: false })
  renderCard?: CanvasCardRenderer

  /** Where the board sits, in board coordinates, and how far it is zoomed. */
  @state()
  private at = { x: 0, y: 0, zoom: 1 }

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

  /** The nodes, which is the document's own list or nothing. */
  private get nodes(): CanvasNode[] {
    return this.data?.nodes ?? []
  }

  /** The edges, the same way. */
  private get edges(): CanvasEdge[] {
    return this.data?.edges ?? []
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
    const node = this.nodes.find((one) => one.id === id)
    if (!node) {
      return
    }
    this.touched = true
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
   */
  private readonly handlePointerDown = (event: PointerEvent): void => {
    /* The primary button only, and never a press that began on a control: the
       buttons are inside this region and a press on one is not a drag. */
    if (event.button !== 0 || (event.target as Element | null)?.closest('[part~="controls"]')) {
      return
    }
    this.touched = true
    this.dragging = {
      at: { x: this.at.x, y: this.at.y },
      from: { x: event.clientX, y: event.clientY },
      pointer: event.pointerId,
    }
    capturePointer(event.currentTarget as Element, event.pointerId)
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    this.idle.stir()
    const drag = this.dragging
    if (!drag || drag.pointer !== event.pointerId) {
      return
    }
    /* No easing while a finger is down: a transition here would drag the board
       along behind the pointer rather than under it. */
    this.at = {
      ...this.at,
      x: drag.at.x + (event.clientX - drag.from.x),
      y: drag.at.y + (event.clientY - drag.from.y),
    }
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (this.dragging?.pointer === event.pointerId) {
      this.dragging = undefined
    }
  }

  /**
   * The wheel, which pans, and the wheel with a modifier, which zooms.
   *
   * **`ctrlKey` is a pinch as well as a control press**, which is the platform's
   * own convention rather than this component's: a trackpad pinch arrives as a
   * wheel event with `ctrlKey` set, on every browser, and a component that
   * ignored it would be the one thing on the page a pinch does not work on.
   *
   * Prevented, because the alternative is the page scrolling out from under a
   * reader who meant to move the board. A wheel over a board is about the board.
   */
  private readonly handleWheel = (event: WheelEvent): void => {
    event.preventDefault()
    this.touched = true
    if (event.ctrlKey) {
      /* About the pointer where the platform says where that is, and about the
         middle where it does not: `offsetX` is absent in more places than a
         component should assume, and a pinch that scaled about `NaN` would send
         the board somewhere nobody asked for. */
      const about = {
        x: Number.isFinite(event.offsetX) ? event.offsetX : this.box.width / 2,
        y: Number.isFinite(event.offsetY) ? event.offsetY : this.box.height / 2,
      }
      this.zoomAbout(event.deltaY < 0 ? 1.1 : 1 / 1.1, about)
      return
    }
    this.at = { ...this.at, x: this.at.x - event.deltaX, y: this.at.y - event.deltaY }
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
    const board = extent(this.nodes)
    const { height: down, width: across } = this.box
    if (board.width === 0 || across === 0 || down === 0) {
      return
    }
    const whole = { height: board.height + MARGIN * 2, width: board.width + MARGIN * 2 }
    const zoom = Math.min(1, across / whole.width, down / whole.height)
    const next = {
      x: (across - whole.width * zoom) / 2,
      y: (down - whole.height * zoom) / 2,
      zoom,
    }
    /* **Only where it moved**, or this never stops. A fit runs after every
       render and assigning a fresh object is a change whatever is in it, so an
       unconditional write re-renders, fits, writes, and the page never finishes
       loading. Measured as a hung example rather than a slow one. */
    if (next.x === this.at.x && next.y === this.at.y && next.zoom === this.at.zoom) {
      return
    }
    this.at = next
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('data')) {
      /* A new document is a new board, and the view a reader chose belonged to
         the old one. */
      this.touched = false
    }
    this.watchBox()
    if (!this.touched) {
      this.fit()
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
        this.fit()
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
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.sizes?.disconnect()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label })
    this.toggleState('empty', this.nodes.length === 0)
    this.toggleState('fullscreen', this.filled)
    this.toggleState('idle', this.resting)
  }

  /** One card, group or link, placed where the document put it. */
  private renderNode(node: CanvasNode, origin: { x: number; y: number }): TemplateResult {
    const body = this.renderCard?.(node)
    const group = node.type === 'group' ? undefined : groupOf(node, this.nodes)
    return html`<article
      part="card"
      aria-label=${node.type === 'group' ? this.textOf(node) : nothing}
      data-type=${node.type}
      data-color=${preset(node.color) ?? nothing}
      data-group=${group?.id ?? nothing}
      id=${`card-${node.id}`}
      role=${node.type === 'group' ? 'group' : 'article'}
      style=${`--_canvas-card-x: ${node.x - origin.x}px; --_canvas-card-y: ${node.y - origin.y}px; --_canvas-card-inline-size: ${node.width}px; --_canvas-card-block-size: ${node.height}px${own(node.color) === undefined ? '' : `; --_canvas-card-color: ${own(node.color)}`}`}
    >
      ${
        body === undefined
          ? html`<p>${this.textOf(node)}</p>`
          : /* Under a name a stylesheet can find. A string arrives escaped and a
               template arrives as the consumer built it, which is where the
               decision to render markup belongs. */
            html`<div data-prose>${body}</div>`
      }
      ${node.type === 'link' && node.url ? html`<a href=${node.url}>${node.url}</a>` : nothing}
    </article>`
  }

  /** The connectors, in one layer under the cards. */
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
          markerUnits="strokeWidth"
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
    const ordered = reading(nodes, this.edges, this.order ?? 'spatial')

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
        @pointercancel=${this.handlePointerUp}
        @pointerdown=${this.handlePointerDown}
        @pointermove=${this.handlePointerMove}
        @pointerup=${this.handlePointerUp}
        @wheel=${this.handleWheel}
      >
        ${
          nodes.length === 0
            ? html`<slot name="empty"></slot>`
            : html`<div
                part="board"
                style=${`--_canvas-x: ${this.at.x}px; --_canvas-y: ${this.at.y}px; --_canvas-zoom: ${this.at.zoom}; --_canvas-plane-inline-size: ${box.width}px; --_canvas-plane-block-size: ${box.height}px`}
              >
                ${this.renderEdges(origin, box)}
                ${nodes.map((node) => this.renderNode(node, origin))}
              </div>`
        }
      </div>
      ${this.renderControls()}
      <ol part="index" aria-label=${this.indexLabel}>
        ${ordered.map(
          (node) => html`<li>
            <button part="index-item" type="button" @click=${() => this.show(node.id)}>
              ${this.textOf(node)}
              ${this.linksOf(node) === '' ? nothing : html`<span>${this.linksOf(node)}</span>`}
            </button>
          </li>`,
        )}
      </ol>
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
