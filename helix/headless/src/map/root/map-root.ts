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
import {
  html,
  nothing,
  type PropertyValues,
  type SVGTemplateResult,
  svg,
  type TemplateResult,
} from 'lit'
import { property, state } from 'lit/decorators.js'
import type { HelixHeadlessMapMarker } from '../marker/map-marker.js'

/** What the frame reads off a layer, which is all its list and menu need. */
interface MapLayer extends Element {
  description?: string | undefined
  /** A raster layer's: whether it is imagery of the ground. */
  ground?: boolean | undefined
  group?: string | undefined
  hidden: boolean
  isMapLayer: true
  label?: string | undefined
  /** Which kind of layer, which picks its picture in the layers menu. */
  layerKind?: string | undefined
}

/**
 * What `ViewportControlsPlacement` is called for a map.
 *
 * The corners are the surface's and the name is the family's, so a consumer who
 * imported this before the surface was shared still has it.
 */
export type MapControlsPlacement = ViewportControlsPlacement

/**
 * A layer's picture in the layers menu, by what it draws: a line for a route,
 * a shape for an area, dots for points, blocks for buildings, a peak for
 * terrain, a photograph for imagery of the ground, and a cloud for tiles
 * over it, such as weather.
 */
const iconOf = (layer: MapLayer | undefined): SVGTemplateResult => {
  switch (layer?.layerKind) {
    case 'route':
      return svg`<path d="M4 19c5 0 4-7 8-7s3-7 8-7" /><circle cx="4" cy="19" r="1.5" /><circle cx="20" cy="5" r="1.5" />`
    case 'area':
      return svg`<path d="M4 8l7-4 9 4-2 11-12 1Z" />`
    case 'points':
      return svg`<circle cx="6" cy="8" r="2" /><circle cx="15" cy="6" r="2" /><circle cx="10" cy="16" r="2" /><circle cx="18" cy="15" r="2" />`
    case 'buildings':
      return svg`<path d="M3 21V10l5-2v13M8 21V4l7 2v15M15 21v-9l6 2v7M2 21h20" />`
    case 'terrain':
      return svg`<path d="M2 20l7-12 4 6 3-4 6 10Z" /><path d="M7.5 10.5 9 12l1.5-1.5" />`
    case 'raster':
      return layer.ground
        ? svg`<rect height="16" rx="2" width="18" x="3" y="4" /><path d="M3 16l5-5 4 4 3-3 6 6" /><circle cx="16" cy="9" r="1.5" />`
        : svg`<path d="M7 16a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.4A3.5 3.5 0 0 1 17 16Z" /><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2" />`
    default:
      return svg`<path d="M12 3 21 8 12 13 3 8Z" /><path d="M3 13l9 5 9-5" />`
  }
}

/** Degrees a rotate button or key turns the map. */
const ROTATE_STEP = 15

/** Degrees a tilt key tilts the map. */
const TILT_STEP = 10

/** The tilt the 3D button goes to, in degrees from looking straight down. */
const TILTED = 50

/**
 * @summary A frame around a map drawn by another library.
 *
 * @description
 * Wraps a map drawn by MapLibre, Leaflet, or another renderer. The frame adds
 * a name for the map, a column of controls, and a strip for the map credit.
 * Helix does not draw the map itself.
 *
 * The controls are one column: fullscreen, the layers button, 3D, zoom, and
 * a compass. The compass's needle points north, and pressing it turns the map
 * to face north. The pan and rotate buttons sit around the compass, so a user
 * can move and turn the map without dragging it. The styled frame shows them
 * while the pointer or the keyboard is on the compass, and always on a screen
 * with no hover, such as a phone.
 *
 * The pan and zoom buttons and the arrow keys send `helix-map-pan` and
 * `helix-map-zoom`. Move your map in response, or connect it with
 * `connectMap` from `@fusion.dev/helix-map`, which does this for you.
 *
 * Add `rotate` and `tilt` to `controls` for buttons that turn and tilt the
 * map, which a map with 3D buildings needs. The 3D button is a toggle. Pressed,
 * it tilts the map 50 degrees, and `connectMap` raises the buildings and the
 * ground. Pressed again, it makes the map flat, and lays them flat too. Shift
 * with the arrow keys turns and tilts the map in steps: left and right rotate,
 * and up and down tilt. They send `helix-map-rotate` and `helix-map-tilt`, which `connectMap`
 * answers on MapLibre. Leaflet draws maps flat and does not rotate.
 *
 * Add `layers` to `controls` for a layers button. It opens a menu with a
 * checkbox for each layer, which sets the layer's `hidden` attribute. Layers
 * with the same `group`, such as a route and its dotted legs, share one
 * checkbox. `connectMap` does not draw a hidden layer, so a layer you write with
 * `hidden` starts turned off.
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
 * @event {HelixMapTiltEvent} helix-map-tilt - The 3D button, or Shift with Up or Down, was pressed. Tilt your map in response.
 * @event {HelixMapZoomEvent} helix-map-zoom - A zoom button or key was pressed, with a direction. Zoom your map in response.
 *
 * @csspart attribution - The strip under the map that holds the credit.
 * @csspart compass - The compass and the pan and rotate buttons around it.
 * @csspart controls - The column of buttons that move the map.
 * @csspart face-north - The compass: its needle points north as the map turns, and pressing it turns the map to face north.
 * @csspart footer - The strip below the map.
 * @csspart fullscreen - The button that makes the map fill the screen.
 * @csspart header - The strip above the map.
 * @csspart layer - One entry in the list of the map's layers.
 * @csspart layer-choice - One layer's tile in the layers menu, pressed while the layer is shown.
 * @csspart layer-icon - The picture on a layer's tile, drawn for its kind: a line for a route, a peak for terrain.
 * @csspart layer-name - The name on a layer's tile.
 * @csspart layers - The list of the map's shown layers, such as routes, areas, and points, read by screen readers.
 * @csspart layers-menu - The menu of the map's layers, which the layers button opens.
 * @csspart layers-toggle - The button that opens and closes the layers menu.
 * @csspart needle - The compass needle, turned to point north.
 * @csspart pan-down - The button that pans the map down.
 * @csspart pan-end - The button that pans toward the end of a line of text: right in English.
 * @csspart pan-start - The button that pans toward the start of a line of text: left in English.
 * @csspart pan-up - The button that pans the map up.
 * @csspart region - The named region the map sits in.
 * @csspart rotate-left - The button that turns the map counterclockwise.
 * @csspart rotate-right - The button that turns the map clockwise.
 * @csspart tilt - The 3D button, which tilts the map and makes it flat again. Pressed while the map is tilted.
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

  /**
   * The map's name, read by screen readers. Name the place, such as "Delivery
   * area", so that several maps on one page can be told apart. Required.
   */
  @property()
  label = ''

  /**
   * The name of the layers button and menu, and of the list of the map's
   * layers, such as routes, areas, and points, read by screen readers.
   */
  @property({ attribute: 'layers-label' })
  layersLabel = 'Map layers'

  /**
   * How far the map is tilted, in degrees from looking straight down.
   * `connectMap` keeps it current, and the 3D button is pressed while it is
   * above `0`.
   */
  @property({ type: Number })
  pitch = 0

  /** The rotate left button's label. */
  @property({ attribute: 'rotate-left-label' })
  rotateLeftLabel = 'Rotate left'

  /** The rotate right button's label. */
  @property({ attribute: 'rotate-right-label' })
  rotateRightLabel = 'Rotate right'

  /** The 3D button's label. */
  @property({ attribute: 'tilt-label' })
  tiltLabel = 'Show in 3D'

  /**
   * The routes and areas among the frame's children, in the order they are
   * written, which is the order the list names them in.
   */
  private get layers(): MapLayer[] {
    return this.knownChildren.filter(
      (child): child is MapLayer => (child as Partial<MapLayer>).isMapLayer === true,
    )
  }

  /** Whether the layers menu is open. */
  @state()
  private layersOpen = false

  /* A layer a page hides or shows itself, which its checkbox and the list
     follow. Made on connection, so the server never builds one. */
  private hiding?: MutationObserver

  /** Closes the layers menu on a press anywhere outside the frame. */
  private readonly handleOutside = (event: PointerEvent): void => {
    if (!event.composedPath().includes(this)) {
      this.layersOpen = false
    }
  }

  /**
   * Keys pressed in the layers menu. Escape closes it and returns to its
   * button, and no key reaches the region, where the arrows would pan the map.
   */
  private readonly handleMenuKeydown = (event: KeyboardEvent): void => {
    event.stopPropagation()
    if (event.key === 'Escape' && this.layersOpen) {
      this.layersOpen = false
      this.renderRoot.querySelector<HTMLElement>('[part="layers-toggle"]')?.focus()
    }
  }

  /** Shows or hides layers, which `connectMap` draws or takes off the map. */
  private showLayers(layers: readonly MapLayer[], shown: boolean): void {
    for (const layer of layers) {
      layer.hidden = !shown
    }
    this.requestUpdate()
  }

  /**
   * The layers menu's entries, in the order the layers are written: a layer
   * of its own, or every layer in a group, at the place of the first.
   */
  private get layerEntries(): MapLayer[][] {
    const entries: MapLayer[][] = []
    const groups = new Map<string, MapLayer[]>()
    for (const layer of this.layers) {
      const had = layer.group ? groups.get(layer.group) : undefined
      if (had) {
        had.push(layer)
        continue
      }
      const entry = [layer]
      entries.push(entry)
      if (layer.group) {
        groups.set(layer.group, entry)
      }
    }
    return entries
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
    this.hiding = new MutationObserver(() => this.requestUpdate())
    this.hiding.observe(this, { attributeFilter: ['hidden'], attributes: true, subtree: true })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.hiding?.disconnect()
    document.removeEventListener('pointerdown', this.handleOutside)
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
    if (changed.has('layersOpen')) {
      if (this.layersOpen) {
        document.addEventListener('pointerdown', this.handleOutside)
      } else {
        document.removeEventListener('pointerdown', this.handleOutside)
      }
    }
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

  /** Tilts the map to some degrees from looking straight down. `0` makes it flat. */
  tiltTo(to: number): void {
    this.dispatchEvent(new HelixMapTiltEvent({ to }))
  }

  /**
   * The layers button and its menu: a tile for each layer or group, in the
   * order they are written, with its picture and name, pressed while it is
   * shown. A group's tile is pressed while any of its layers is shown.
   */
  private renderLayersMenu(): TemplateResult | typeof nothing {
    const layers = this.layers
    if (!this.drawsControls('layers') || layers.length === 0) {
      return nothing
    }
    return html`<button
        part="layers-toggle"
        aria-controls="layers-menu"
        aria-expanded=${this.layersOpen ? 'true' : 'false'}
        aria-label=${this.layersLabel}
        type="button"
        @click=${() => {
          this.layersOpen = !this.layersOpen
        }}
        @keydown=${this.handleMenuKeydown}
      >
        <svg aria-hidden="true" fill="none" height="16" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 16 16" width="16">
          <path d="M8 2.5 14 6 8 9.5 2 6Z" />
          <path d="M2 9.5 8 13 14 9.5" />
        </svg>
      </button>
      <div
        part="layers-menu"
        id="layers-menu"
        role="group"
        aria-label=${this.layersLabel}
        ?hidden=${!this.layersOpen}
        @keydown=${this.handleMenuKeydown}
      >
        ${this.layerEntries.map((entry) => {
          const shown = entry.some((layer) => !layer.hidden)
          return html`<button
            part="layer-choice"
            aria-pressed=${shown ? 'true' : 'false'}
            type="button"
            @click=${() => this.showLayers(entry, !shown)}
          >
            <svg part="layer-icon" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24">
              ${iconOf(entry[0])}
            </svg>
            <span part="layer-name">${entry[0]?.label ?? ''}</span>
          </button>`
        })}
      </div>`
  }

  /**
   * The compass, and the pan and rotate buttons around it.
   *
   * **One control for which way the map faces and where it goes.** The needle
   * turns with the map and points north; pressing it turns the map back. The
   * arrows around it are the way to move and turn the map without dragging,
   * which a pointer otherwise needs, and the styled tier shows them where the
   * pointer or the keyboard is on the compass.
   */
  private renderCompass(pan: boolean, rotate: boolean): TemplateResult {
    return html`<div part="compass">
      ${
        rotate
          ? html`<button part="rotate-left" aria-label=${this.rotateLeftLabel} type="button" @click=${() => this.rotate(-ROTATE_STEP)}>
              ↺
            </button>`
          : nothing
      }
      ${
        pan
          ? html`<button part="pan-up" aria-label=${this.panLabel('up')} type="button" @click=${() => this.pan('up')}>
              ${this.panGlyph('up')}
            </button>`
          : nothing
      }
      ${
        rotate
          ? html`<button part="rotate-right" aria-label=${this.rotateRightLabel} type="button" @click=${() => this.rotate(ROTATE_STEP)}>
              ↻
            </button>`
          : nothing
      }
      ${
        pan
          ? html`<button part="pan-start" aria-label=${this.panLabel('start')} type="button" @click=${() => this.pan('start')}>
              ${this.panGlyph('start')}
            </button>`
          : nothing
      }
      <button part="face-north" aria-label=${this.faceNorthLabel} type="button" style=${`--map-needle-turn: ${-this.bearing}deg`} @click=${() => this.faceNorth()}>
        <svg part="needle" aria-hidden="true" viewBox="0 0 16 16">
          <path data-end="north" d="M8 1.5 10.5 8h-5Z" />
          <path data-end="south" d="M8 14.5 5.5 8h5Z" />
        </svg>
      </button>
      ${
        pan
          ? html`<button part="pan-end" aria-label=${this.panLabel('end')} type="button" @click=${() => this.pan('end')}>
              ${this.panGlyph('end')}
            </button>`
          : nothing
      }
      ${
        pan
          ? html`<button part="pan-down" aria-label=${this.panLabel('down')} type="button" @click=${() => this.pan('down')}>
              ${this.panGlyph('down')}
            </button>`
          : nothing
      }
    </div>`
  }

  /**
   * The controls, in one column in the order they are read: fullscreen, the
   * layers, 3D, zoom, and the compass with the arrows round it, last, where
   * the room its arrows take is below the column and not inside it.
   *
   * **Drawn here, not by the surface**, which lays its pad out for a board:
   * a map's arrows belong round its compass, and the reading order is the
   * column's, top to bottom.
   */
  protected override renderControls(): TemplateResult | typeof nothing {
    const pan = this.drawsControls('pan')
    const zoom = this.drawsControls('zoom')
    const rotate = this.drawsControls('rotate')
    const tilt = this.drawsControls('tilt')
    const fullscreen = this.drawsControls('fullscreen')
    const menu = this.renderLayersMenu()
    if (!pan && !zoom && !rotate && !tilt && !fullscreen && menu === nothing) {
      return nothing
    }
    return html`<div part="controls" role="group" aria-label=${this.controlsLabel ?? this.restingControlsLabel}>
      ${
        fullscreen
          ? html`<button
              part="fullscreen"
              aria-label=${this.fullscreenLabel}
              aria-pressed=${this.filled ? 'true' : 'false'}
              type="button"
              @click=${this.toggleFullscreen}
            >
              ⤢
            </button>`
          : nothing
      }
      ${menu}
      ${
        tilt
          ? html`<button
              part="tilt"
              aria-label=${this.tiltLabel}
              aria-pressed=${this.pitch > 0 ? 'true' : 'false'}
              type="button"
              @click=${() => this.tiltTo(this.pitch > 0 ? 0 : TILTED)}
            >
              3D
            </button>`
          : nothing
      }
      ${
        zoom
          ? html`<button part="zoom-in" aria-label=${this.zoomInLabel} type="button" @click=${() => this.zoom(1)}>
                +
              </button>
              <button part="zoom-out" aria-label=${this.zoomOutLabel} type="button" @click=${() => this.zoom(-1)}>
                −
              </button>`
          : nothing
      }
      ${pan || rotate ? this.renderCompass(pan, rotate) : nothing}
    </div>`
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

  /** Shift with the arrow keys: left and right rotate, and up and down tilt in steps. */
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
    const layers = this.layers.filter((layer) => !layer.hidden)
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
