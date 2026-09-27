import {
  customElement,
  HelixActivateEvent,
  HelixElement,
  HelixMapClusterEvent,
  HelixMapPanEvent,
  HelixMapPartChangeEvent,
  HelixMapRotateEvent,
  HelixMapTiltEvent,
  HelixMapZoomEvent,
  hostAria,
  KeyboardNavigationController,
  MixinViewport,
  type NavigableItem,
  type ViewportControlsPlacement,
  type ViewportPanDetail,
  type ViewportZoomDetail,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import type { HelixHeadlessMapMarker } from '../marker/map-marker.js'

/** What the frame reads off a route or an area, which is all its list needs. */
interface MapLayer {
  description?: string | undefined
  isMapLayer: true
  label?: string | undefined
}

/**
 * What `ViewportControlsPlacement` is called for a map.
 *
 * The corners are the surface's and the name is the family's, so a consumer who
 * imported this before the surface was shared still has it.
 */
export type MapControlsPlacement = ViewportControlsPlacement

/** Degrees a rotate button or key turns the map. */
const ROTATE_STEP = 15

/** Degrees a tilt button or key tilts the map. */
const TILT_STEP = 10

/**
 * @summary A frame around a map drawn by another library.
 *
 * @description
 * Wraps a map drawn by MapLibre, Leaflet, or another renderer. The frame adds
 * a name for the map, pan and zoom buttons, a fullscreen button, and a strip
 * for the map credit. Helix does not draw the map itself.
 *
 * The pan and zoom buttons and the arrow keys send `helix-map-pan` and
 * `helix-map-zoom`. Move your map in response, or connect it with
 * `connectMap` from `@fusion.dev/helix-map`, which does this for you.
 *
 * Add `rotate` and `tilt` to `controls` for buttons that turn and tilt the
 * map, which a map with 3D buildings needs. Shift with the arrow keys does the
 * same: left and right rotate, up tilts, and down flattens. They send
 * `helix-map-rotate` and `helix-map-tilt`, which `connectMap` answers on
 * MapLibre. Leaflet draws maps flat and does not rotate.
 *
 * Markers, routes, areas, live positions, and points layers go inside the
 * frame as child elements.
 *
 * @since 0.100.0
 * @status experimental
 * @category media
 * @aliases Map frame, Map container, Geo
 * @documentation https://fusion.dev/helix/components/map
 *
 * @slot - The element your renderer draws the map in, and the map's markers, routes, areas, positions, and points layers.
 * @slot attribution - The map credit, which most tile licenses require.
 * @slot footer - Content below the map, such as a legend or a scale.
 * @slot header - Content above the map, such as a title or a search field.
 *
 * @event {HelixActivateEvent} helix-activate - A marker was pressed. The value is the marker's `name`, or its `label` if it has no name. A cluster sends `helix-map-cluster` instead.
 * @event {HelixMapClusterEvent} helix-map-cluster - A cluster was pressed. Sent from the marker that shows the cluster, with the names of its places.
 * @event {HelixMapPanEvent} helix-map-pan - A pan button or arrow key was pressed. Move your map in response.
 * @event {HelixMapPartChangeEvent} helix-map-part-change - Clustering was turned on or off. Used by `connectMap`; pages do not need to listen for it.
 * @event {HelixMapRotateEvent} helix-map-rotate - A rotate or Face north button, or Shift with Left or Right, was pressed. Turn your map in response.
 * @event {HelixMapTiltEvent} helix-map-tilt - A tilt or flatten button, or Shift with Up or Down, was pressed. Tilt your map in response.
 * @event {HelixMapZoomEvent} helix-map-zoom - A zoom button or key was pressed, with a direction. Zoom your map in response.
 *
 * @csspart attribution - The strip under the map that holds the credit.
 * @csspart controls - The group of buttons that move the map.
 * @csspart face-north - The button that turns the map to face north. Its needle points north as the map turns.
 * @csspart flatten - The button that tilts the map back toward flat.
 * @csspart footer - The strip below the map.
 * @csspart fullscreen - The button that makes the map fill the screen.
 * @csspart header - The strip above the map.
 * @csspart layer - One entry in the list of the map's layers.
 * @csspart layers - The list of the map's layers, such as routes, areas, and points, read by screen readers.
 * @csspart needle - The arrow inside the Face north button, turned to point north.
 * @csspart pan-down - The button that pans the map down.
 * @csspart pan-end - The button that pans toward the end of a line of text: right in English.
 * @csspart pan-start - The button that pans toward the start of a line of text: left in English.
 * @csspart pan-up - The button that pans the map up.
 * @csspart region - The named region the map sits in.
 * @csspart rotate-left - The button that turns the map counterclockwise.
 * @csspart rotate-right - The button that turns the map clockwise.
 * @csspart tilt - The button that tilts the map toward the horizon.
 * @csspart viewport - The box the map is drawn in.
 * @csspart zoom-in - The button that zooms in.
 * @csspart zoom-out - The button that zooms out.
 *
 * @cssproperty --map-needle-turn - How far the needle turns to point north, as an angle. The frame writes it from `bearing`.
 *
 * @cssstate fullscreen - The map fills the screen.
 * @cssstate idle - The user has been still long enough for the header and footer to fade.
 */
@customElement('helix-headless-map')
export class HelixHeadlessMap extends MixinViewport(HelixElement) {
  /**
   * The map's rotation, in degrees clockwise from north. `connectMap` keeps it
   * current, and the Face north button's needle turns with it.
   */
  @property({ type: Number })
  bearing = 0

  /**
   * Combines markers that would overlap into one count. Counts split apart as
   * the map zooms in, and pressing one zooms in to its places.
   */
  @property({ type: Boolean })
  cluster = false

  /** The Face north button's label. */
  @property({ attribute: 'face-north-label' })
  faceNorthLabel = 'Face north'

  /** The flatten button's label. */
  @property({ attribute: 'flatten-label' })
  flattenLabel = 'Flatten the map'

  /**
   * The map's name, read by screen readers. Name the place, such as "Delivery
   * area", so that several maps on one page can be told apart. Required.
   */
  @property()
  label = ''

  /**
   * The name of the list of the map's layers, such as routes, areas, and
   * points, read by screen readers.
   */
  @property({ attribute: 'layers-label' })
  layersLabel = 'Map layers'

  /** The rotate left button's label. */
  @property({ attribute: 'rotate-left-label' })
  rotateLeftLabel = 'Rotate left'

  /** The rotate right button's label. */
  @property({ attribute: 'rotate-right-label' })
  rotateRightLabel = 'Rotate right'

  /** The tilt button's label. */
  @property({ attribute: 'tilt-label' })
  tiltLabel = 'Tilt the map'

  /**
   * The routes and areas among the frame's children, in the order they are
   * written, which is the order the list names them in.
   */
  private get layers(): MapLayer[] {
    return this.knownChildren.filter(
      (child): child is MapLayer & Element => (child as Partial<MapLayer>).isMapLayer === true,
    )
  }

  /**
   * A route or area renamed, or its description changed, which the list says
   * and a slot change does not report.
   */
  private readonly handlePartChange = (event: HelixMapPartChangeEvent): void => {
    if (event.detail.kind !== 'place') {
      this.requestUpdate()
    }
  }

  /**
   * The markers among the frame's children, in the order they are written,
   * which is the order the arrow keys walk them in.
   */
  private get markers(): HelixHeadlessMapMarker[] {
    return this.knownChildren.filter(
      (child): child is HelixHeadlessMapMarker =>
        (child as Partial<HelixHeadlessMapMarker>).isMapMarker === true,
    )
  }

  /**
   * The marker the map's one tab stop is on, by position among the markers:
   * the one a reader last reached, and the first before they have reached any.
   */
  @state()
  private stop = 0

  /* Arrow keys, Home and End between the markers, wrapping, the controller the
     accordion and the tabs use: `origin: 'focus'` because the press says which
     marker it came from, and `selects` off because arriving on a place does
     nothing but arrive. The frame's own arrows pan the map, and only from the
     frame's region, so a press on a marker walks rather than pans. */
  protected readonly keys = new KeyboardNavigationController(this, {
    items: () =>
      this.markers.map(
        (marker, at): NavigableItem => ({
          /* The marker itself, as a browser retargets a press from its
             shadow root to it, or a node inside that root, as an engine that
             does not retarget reports it. */
          contains: (node) =>
            node !== null && (marker.contains(node) || marker.shadowRoot?.contains(node) === true),
          /* Hidden inside a cluster, which the walk reaches instead. */
          disabled: marker.gatheredBy !== undefined,
          /* The stop moves with the walk rather than waiting to hear focus
             arrive: a focus event from inside a marker's own shadow root is
             one an engine can fail to carry out to the frame, and the stop
             is the walk's to keep. */
          focusItem: () => {
            this.stop = at
            marker.focus()
          },
          select: () => {},
          selected: false,
        }),
      ),
    origin: 'focus',
    selects: () => false,
  })

  /** The marker a press or a click came from, where it came from one. */
  private markerOf(event: Event): HelixHeadlessMapMarker | undefined {
    return event
      .composedPath()
      .find(
        (one): one is HelixHeadlessMapMarker =>
          (one as Partial<HelixHeadlessMapMarker>).isMapMarker === true,
      )
  }

  /** Moves the tab stop to the marker focus arrived at. */
  private readonly handleFocusIn = (event: FocusEvent): void => {
    const marker = this.markerOf(event)
    const at = marker ? this.markers.indexOf(marker) : -1
    if (at !== -1) {
      this.stop = at
    }
  }

  /**
   * Says a marker was pressed, by click, Enter or Space: a place by its name,
   * and a cluster as a cluster, from the marker it is drawn as.
   */
  private activate(marker: HelixHeadlessMapMarker): void {
    if (marker.gathered.length > 1) {
      marker.dispatchEvent(new HelixMapClusterEvent({ labels: [...marker.gathered] }))
      return
    }
    this.dispatchEvent(new HelixActivateEvent({ value: marker.name || marker.label || '' }))
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const marker = this.markerOf(event)
    if (marker) {
      this.activate(marker)
    }
  }

  /**
   * **Enter on the press and Space on the release**, as a native button
   * takes them, and a key held down says it once: auto-repeat sent a travel
   * thirty times a second, each restarting the last.
   */
  private readonly handleMarkerKeydown = (event: KeyboardEvent): void => {
    const marker = this.markerOf(event)
    if (!marker || (event.key !== 'Enter' && event.key !== ' ')) {
      return
    }
    /* Space's own default is to scroll the page, which a press on a button does not. */
    event.preventDefault()
    if (event.key === 'Enter' && !event.repeat) {
      this.activate(marker)
    }
  }

  private readonly handleMarkerKeyup = (event: KeyboardEvent): void => {
    const marker = this.markerOf(event)
    if (marker && event.key === ' ') {
      event.preventDefault()
      this.activate(marker)
    }
  }

  /** A marker added or taken away is a walk of a different length. */
  private readonly handleSlotChange = (): void => {
    this.requestUpdate()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener(HelixMapPartChangeEvent.eventName, this.handlePartChange)
    this.addEventListener('click', this.handleClick)
    this.addEventListener('focusin', this.handleFocusIn)
    this.addEventListener('keydown', this.handleMarkerKeydown)
    this.addEventListener('keyup', this.handleMarkerKeyup)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener(HelixMapPartChangeEvent.eventName, this.handlePartChange)
    this.removeEventListener('click', this.handleClick)
    this.removeEventListener('focusin', this.handleFocusIn)
    this.removeEventListener('keydown', this.handleMarkerKeydown)
    this.removeEventListener('keyup', this.handleMarkerKeyup)
  }

  /**
   * Puts the tab stop on one marker and takes it off the rest, the roving
   * pattern the toolbar uses: every marker at `-1` is a map whose places the
   * keyboard cannot reach, and every one at `0` is a Tab press per place.
   */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const markers = this.markers
    /* On the cluster standing for the marker the stop was on, while it is
       gathered, so Tab still reaches the map's places. */
    const on = markers[Math.min(this.stop, markers.length - 1)]
    const stop = on?.gatheredBy ?? on
    for (const marker of markers) {
      marker.current = marker === stop
    }
    /* Asked of the connector as a place is: the next placing gathers or lets go. */
    if (changed.has('cluster')) {
      this.dispatchEvent(new HelixMapPartChangeEvent({ kind: 'place' }))
    }
  }

  /** Turns the map by some degrees, clockwise where positive. */
  rotate(by: number): void {
    this.dispatchEvent(new HelixMapRotateEvent({ by }))
  }

  /** Turns the map to face north. */
  faceNorth(): void {
    this.dispatchEvent(new HelixMapRotateEvent({ to: 0 }))
  }

  /** Tilts the map by some degrees, toward the horizon where positive. */
  tilt(by: number): void {
    this.dispatchEvent(new HelixMapTiltEvent({ by }))
  }

  /** The rotate and tilt buttons, where `controls` names them. */
  protected override renderMoreControls(): TemplateResult | typeof nothing {
    const rotate = this.drawsControls('rotate')
    const tilt = this.drawsControls('tilt')
    if (!rotate && !tilt) {
      return nothing
    }
    return html`${
      rotate
        ? html`<button part="rotate-left" aria-label=${this.rotateLeftLabel} type="button" @click=${() => this.rotate(-ROTATE_STEP)}>
              ↺
            </button>
            <button part="face-north" aria-label=${this.faceNorthLabel} type="button" style=${`--map-needle-turn: ${-this.bearing}deg`} @click=${() => this.faceNorth()}>
              <span part="needle" aria-hidden="true">↑</span>
            </button>
            <button part="rotate-right" aria-label=${this.rotateRightLabel} type="button" @click=${() => this.rotate(ROTATE_STEP)}>
              ↻
            </button>`
        : nothing
    }${
      tilt
        ? html`<button part="tilt" aria-label=${this.tiltLabel} type="button" @click=${() => this.tilt(TILT_STEP)}>
              3D
            </button>
            <button part="flatten" aria-label=${this.flattenLabel} type="button" @click=${() => this.tilt(-TILT_STEP)}>
              2D
            </button>`
        : nothing
    }`
  }

  /** The keys the region answers, which `rotate` and `tilt` add to. */
  private get keyShortcuts(): string {
    const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Plus', 'Minus']
    if (this.drawsControls('rotate')) {
      keys.push('Shift+ArrowLeft', 'Shift+ArrowRight')
    }
    if (this.drawsControls('tilt')) {
      keys.push('Shift+ArrowUp', 'Shift+ArrowDown')
    }
    return keys.join(' ')
  }

  /** Shift with the arrow keys: left and right rotate, up tilts, and down flattens. */
  protected override handleMoreKeys(event: KeyboardEvent): boolean {
    if (!event.shiftKey) {
      return false
    }
    if (this.drawsControls('rotate') && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      this.rotate(event.key === 'ArrowLeft' ? -ROTATE_STEP : ROTATE_STEP)
      return true
    }
    if (this.drawsControls('tilt') && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      this.tilt(event.key === 'ArrowUp' ? TILT_STEP : -TILT_STEP)
      return true
    }
    return false
  }

  /** The events this family names, the surface naming none of its own. */
  protected override panEvent(detail: ViewportPanDetail): Event {
    return new HelixMapPanEvent(detail)
  }

  protected override zoomEvent(detail: ViewportZoomDetail): Event {
    return new HelixMapZoomEvent(detail)
  }

  /**
   * What the group of controls is called.
   *
   * The surface is shared and this is the half that is a map: a reader meeting
   * the group hears what it drives rather than "view controls", which names the
   * mechanism.
   */
  protected override get restingControlsLabel(): string {
    return 'Map controls'
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* The host carries the name, so a consumer's own `aria-label` is the thing
       that wins rather than fighting an attribute this wrote. */
    hostAria(this.internals, { label: this.label })
    this.toggleState('fullscreen', this.filled)
    this.toggleState('idle', this.resting)
  }

  /**
   * The routes and areas, named, for a reader who cannot see the map.
   *
   * **What the renderer draws is a picture to a screen reader**, so a route
   * from the depot or a delivery zone is not on the page at all until this
   * says it is. A list rather than a live region, because the reader should
   * find it when they come to the map rather than be told about it as it
   * changes. Nothing where there are none, so a map with only markers says
   * no more than it did.
   *
   * **Written once the frame knows its children**, which is in the browser:
   * the server renders the frame before it has any, and a route is only on
   * the page once a renderer has drawn it, which is later still.
   */
  protected renderLayers(): TemplateResult | typeof nothing {
    const layers = this.layers
    if (layers.length === 0) {
      return nothing
    }
    return html`<ul part="layers" aria-label=${this.layersLabel}>
      ${layers.map(
        (layer) =>
          html`<li part="layer">${layer.label ?? ''}${layer.description ? `, ${layer.description}` : ''}</li>`,
      )}
    </ul>`
  }

  /**
   * The frame, with each region in a box of its own.
   *
   * **The boxes are load-bearing rather than tidiness.** A `<slot>` is
   * `display: contents`, so what lands in the grid is whatever a consumer
   * assigned rather than the slot itself: with no header slotted, the viewport
   * took the first row and the attribution took the `1fr`, and the map collapsed
   * to the height of one line of text. Which slots a consumer fills is not
   * something the layout may depend on, so each region is a box that holds its
   * row whether or not anything is in it, and an empty one is a row of no
   * height.
   */
  protected override render(): TemplateResult {
    return html`<div
      part="region"
      role="group"
      aria-label=${this.label || 'Map'}
      aria-keyshortcuts=${this.keyShortcuts}
      tabindex="0"
      @focusin=${this.idle.stir}
      @keydown=${this.handleKeydown}
      @pointerleave=${this.idle.leave}
      @pointermove=${this.idle.stir}
    >
      <div part="header">
        <slot name="header"></slot>
      </div>
      <div part="viewport">
        <slot @slotchange=${this.handleSlotChange}></slot>
      </div>
      ${this.renderLayers()}
      ${this.renderControls()}
      <div part="footer">
        <slot name="footer"></slot>
      </div>
      <div part="attribution">
        <slot name="attribution"></slot>
      </div>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-map': HelixHeadlessMap
  }
}
